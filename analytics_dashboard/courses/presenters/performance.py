from collections import namedtuple
import logging

from analyticsclient.exceptions import NotFoundError
from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext_lazy as _

from common.course_structure import CourseStructure
from courses import utils
from courses.exceptions import NoAnswerSubmissionsError
from courses.presenters import (BasePresenter, CourseAPIPresenterMixin)


logger = logging.getLogger(__name__)

# Stores the answer distribution return from CoursePerformancePresenter
AnswerDistributionEntry = namedtuple('AnswerDistributionEntry', [
    'last_updated',
    'questions',
    'active_question',
    'answer_distribution',
    'answer_distribution_limited',
    'is_random',
    'answer_type',
    'problem_part_description'
])


class CoursePerformancePresenter(CourseAPIPresenterMixin, BasePresenter):
    """
    Presenter for the performance page.
    """

    # limit for the number of bars to display in the answer distribution chart
    CHART_LIMIT = 12

    # minimum screen space a grading policy bar will take up (even if a policy is 0%, display some bar)
    MIN_POLICY_DISPLAY_PERCENT = 5

    def get_answer_distribution(self, problem_id, problem_part_id):
        """
        Retrieve answer distributions for a particular module/problem and problem part.
        """

        module = self.client.modules(self.course_id, problem_id)

        api_response = module.answer_distribution()
        questions = self._build_questions(api_response)

        filtered_active_question = [i for i in questions if i['part_id'] == problem_part_id]
        if len(filtered_active_question) == 0:
            raise NotFoundError
        else:
            active_question = filtered_active_question[0]['question']

        answer_distributions = self._build_answer_distribution(api_response, problem_part_id)
        problem_part_description = self._build_problem_description(problem_part_id, questions)

        is_random = self._is_answer_distribution_random(answer_distributions)
        answer_distribution_limited = None
        if not is_random:
            # only display the top in the chart
            answer_distribution_limited = answer_distributions[:self.CHART_LIMIT]

        answer_type = self._get_answer_type(answer_distributions)
        last_updated = self.parse_api_datetime(answer_distributions[0]['created'])
        self._last_updated = last_updated

        return AnswerDistributionEntry(last_updated, questions, active_question, answer_distributions,
                                       answer_distribution_limited, is_random, answer_type, problem_part_description)

    def _build_problem_description(self, problem_part_id, questions):
        """ Returns the displayable problem name. """
        problem = [q for q in questions if q['part_id'] == problem_part_id][0]
        return problem['short_description']

    def _get_answer_type(self, answer_distributions):
        """
        Returns either 'text' or 'numeric' to describe the answer and used in the JS table to format
        and sort the dataset.
        """
        field = 'answer_value'
        for ad in answer_distributions:
            if ad[field] is not None and not utils.number.is_number(ad[field]):
                return 'text'
        return 'numeric'

    def _is_answer_distribution_random(self, answer_distributions):
        """
        Problems are considered randomized if variant is populated with values
        greater than 1.
        """
        for ad in answer_distributions:
            variant = ad['variant']
            if variant is not None and variant is not 1:
                return True
        return False

    def _build_questions(self, answer_distributions):
        """
        Builds the questions and part_id from the answer distribution. Displayed
        drop down.
        """
        questions = []
        part_id_to_problem = {}

        # Collect unique questions from the answer distribution
        for question_answer in answer_distributions:
            question = question_answer.get('question_text', None)
            problem_name = question_answer.get('problem_display_name', None)
            part_id_to_problem[question_answer['part_id']] = {
                'question': question,
                'problem_name': problem_name
            }

        for part_id, problem in part_id_to_problem.iteritems():
            questions.append({
                'part_id': part_id,
                'question': problem['question'],
                'problem_name': problem['problem_name']
            })

        utils.sorting.natural_sort(questions, 'part_id')

        # add an enumerated label
        has_parts = len(questions) > 1
        for i, question in enumerate(questions):
            text = question['question']
            question_num = i + 1
            question_template = _('Submissions')
            short_description_template = ''
            if text:
                if has_parts:
                    question_template = _('Submissions for Part {part_number}: {part_description}')
                    short_description_template = _('Part {part_number}: {part_description}')
                else:
                    question_template = _('Submissions: {part_description}')
                    short_description_template = _('{part_description}')
            else:
                if has_parts:
                    question_template = _('Submissions for Part {part_number}')
                    short_description_template = _('Part {part_number}')

            # pylint: disable=no-member
            question['question'] = question_template.format(part_number=question_num, part_description=text)
            question['short_description'] = short_description_template.format(
                part_number=question_num, part_description=text)

        return questions

    def _build_answer_distribution(self, api_response, problem_part_id):
        """ Filter for this problem part and sort descending order. """
        answer_distributions = [i for i in api_response if i['part_id'] == problem_part_id]
        answer_distributions = sorted(answer_distributions, key=lambda a: -a['count'])
        return answer_distributions

    def grading_policy(self):
        """ Returns the grading policy for the represented course."""
        key = self.get_cache_key('grading_policy')
        grading_policy = cache.get(key)

        if not grading_policy:
            logger.debug('Retrieving grading policy for course: %s', self.course_id)
            grading_policy = self.course_api_client.grading_policies(self.course_id).get()

            # Remove empty assignment types as they are not useful and will cause issues downstream.
            grading_policy = [item for item in grading_policy if item['assignment_type']]

            cache.set(key, grading_policy)

        return grading_policy

    def get_max_policy_display_percent(self, grading_policy):
        """
        Returns the maximum width that a grading bar can be for display, given
        the min width, MIN_POLICY_DISPLAY_PERCENT.
        """
        max_percent = 100
        for policy in grading_policy:
            if policy['weight'] < (self.MIN_POLICY_DISPLAY_PERCENT / 100.0):
                max_percent -= self.MIN_POLICY_DISPLAY_PERCENT
        return max_percent

    def assignment_types(self):
        """ Returns the assignment types for the represented course."""
        grading_policy = self.grading_policy()
        # return the results in a similar format to the course structure for standard parsing
        return [{'name': gp['assignment_type']} for gp in grading_policy]

    def fetch_course_module_data(self):
        # Implementation of abstract method.  Returns problems from data api.
        try:
            problems = self.client.courses(self.course_id).problems()
        except NotFoundError:
            raise NoAnswerSubmissionsError(course_id=self.course_id)
        return problems

    def attach_computed_data(self, problem):
        # Change the id key name
        problem['id'] = problem.pop('module_id')
        # Add an percent and incorrect_submissions field
        total = problem['total_submissions']
        problem['correct_percent'] = utils.math.calculate_percent(problem['correct_submissions'], total)
        problem['incorrect_submissions'] = total - problem['correct_submissions']
        problem['incorrect_percent'] = utils.math.calculate_percent(problem['incorrect_submissions'], total)

    def post_process_adding_data_to_blocks(self, data, parent_block, child_block, url_func=None):
        # not all problems have submissions
        if len(data['part_ids']) > 0:
            utils.sorting.natural_sort(data['part_ids'])
            if url_func:
                data['url'] = url_func(parent_block, child_block, data)

    @property
    def default_block_data(self):
        return {
            'total_submissions': 0,
            'correct_submissions': 0,
            'correct_percent': 0,
            'incorrect_submissions': 0,
            'incorrect_percent': 0,
            'part_ids': []
        }

    def assignments(self, assignment_type=None):
        """ Returns the assignments (and problems) for the represented course. """

        assignment_type_name = None if assignment_type is None else assignment_type['name']
        assignment_type_key = self.get_cache_key(u'assignments_{}'.format(assignment_type_name))
        assignments = cache.get(assignment_type_key)

        if not assignments:
            all_assignments_key = self.get_cache_key(u'assignments')
            assignments = cache.get(all_assignments_key)

            if not assignments:
                structure = self._get_structure()
                assignments = CourseStructure.course_structure_to_assignments(
                    structure, graded=True, assignment_type=None)
                cache.set(all_assignments_key, assignments)

            if assignment_type:
                assignment_type['name'] = assignment_type['name'].lower()
                assignments = [assignment for assignment in assignments if
                               assignment['assignment_type'].lower() == assignment_type['name']]

            self.add_child_data_to_parent_blocks(assignments, self._build_graded_answer_distribution_url)
            self.attach_data_to_parents(assignments, self._build_assignment_url)

            # Cache the data for the course-assignment_type combination.
            cache.set(assignment_type_key, assignments)

        return assignments

    def attach_aggregated_data_to_parent(self, index, parent, url_func=None):
        children = parent['children']
        total_submissions = sum(child.get('total_submissions', 0) for child in children)
        correct_submissions = sum(child.get('correct_submissions', 0) for child in children)
        parent['num_children'] = len(children)
        parent['total_submissions'] = total_submissions
        parent['correct_submissions'] = correct_submissions
        parent['correct_percent'] = utils.math.calculate_percent(
            correct_submissions, total_submissions)
        parent['incorrect_submissions'] = total_submissions - correct_submissions
        parent['incorrect_percent'] = utils.math.calculate_percent(
            parent['incorrect_submissions'], total_submissions)
        parent['index'] = index + 1
        # removing the URL keeps navigation between the menu and bar chart consistent
        if url_func and parent['total_submissions'] > 0:
            parent['url'] = url_func(parent)

    def _build_graded_answer_distribution_url(self, parent, problem, parts):
        return reverse('courses:performance:answer_distribution',
                       kwargs={
                           'course_id': self.course_id,
                           'assignment_id': parent['id'],
                           'problem_id': problem['id'],
                           'problem_part_id': parts['part_ids'][0]
                       })

    def build_module_url_func(self, section_id):
        def build_url(parent, problem, parts):
            return reverse('courses:performance:ungraded_answer_distribution',
                           kwargs={
                               'course_id': self.course_id,
                               'section_id': section_id,
                               'subsection_id': parent['id'],
                               'problem_id': problem['id'],
                               'problem_part_id': parts['part_ids'][0]
                           })

        return build_url

    def _build_assignment_url(self, assignment):
        return reverse('courses:performance:assignment', kwargs={
            'course_id': self.course_id, 'assignment_id': assignment['id']})

    def build_section_url(self, section):
        return reverse('courses:performance:ungraded_section', kwargs={'course_id': self.course_id,
                                                                       'section_id': section['id']})

    def build_subsection_url_func(self, section_id):
        """
        Returns a function for creating the ungraded subsection URL.
        """
        # Using closures to keep the section ID available
        def subsection_url(subsection):
            return reverse('courses:performance:ungraded_subsection',
                           kwargs={'course_id': self.course_id,
                                   'section_id': section_id,
                                   'subsection_id': subsection['id']})
        return subsection_url

    def blocks_have_data(self, assignments):
        if assignments:
            for assignment in assignments:
                if assignment['total_submissions'] > 0:
                    return True
        return False

    def assignment(self, assignment_id):
        """ Retrieve a specific assignment. """
        filtered = [assignment for assignment in self.assignments() if assignment['id'] == assignment_id]
        if filtered:
            return filtered[0]
        else:
            return None

    @property
    def section_type_template(self):
        return u'ungraded_sections_{}_{}'

    @property
    def all_sections_key(self):
        return u'ungraded_sections'

    @property
    def module_type(self):
        return 'problem'
