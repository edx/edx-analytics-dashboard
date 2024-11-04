# Repository Coverage

[Full report](https://htmlpreview.github.io/?https://github.com/edx/edx-analytics-dashboard/blob/python-coverage-comment-action-data/htmlcov/index.html)

| Name                                                                       |    Stmts |     Miss |   Branch |   BrPart |   Cover |   Missing |
|--------------------------------------------------------------------------- | -------: | -------: | -------: | -------: | ------: | --------: |
| analytics\_dashboard/\_\_init\_\_.py                                       |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/\_\_init\_\_.py                                  |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/apps.py                                          |       13 |        4 |        2 |        0 |     60% |13-15, 19-20 |
| analytics\_dashboard/core/context\_processors.py                           |        3 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/exceptions.py                                    |        1 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/management/\_\_init\_\_.py                       |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/management/commands/\_\_init\_\_.py              |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/management/commands/delete\_auto\_auth\_users.py |        8 |        8 |        0 |        0 |      0% |      1-15 |
| analytics\_dashboard/core/middleware.py                                    |       15 |        0 |        2 |        0 |    100% |           |
| analytics\_dashboard/core/migrations/0001\_initial.py                      |        6 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/migrations/0002\_auto\_20160729\_1156.py         |        6 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/migrations/0003\_auto\_20160801\_1741.py         |        5 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/migrations/0004\_auto\_20170720\_1310.py         |        5 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/migrations/\_\_init\_\_.py                       |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/models.py                                        |        8 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/templatetags/\_\_init\_\_.py                     |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/templatetags/dashboard\_extras.py                |       85 |        0 |       16 |        0 |    100% |           |
| analytics\_dashboard/core/tests/\_\_init\_\_.py                            |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/core/utils.py                                         |       47 |        0 |       18 |        0 |    100% |           |
| analytics\_dashboard/core/views.py                                         |       75 |       14 |       10 |        1 |     78% |18-19, 34->36, 123-125, 128-137 |
| analytics\_dashboard/courses/\_\_init\_\_.py                               |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/courses/exceptions.py                                 |       23 |        3 |        0 |        0 |     87% |27, 30, 39 |
| analytics\_dashboard/courses/middleware.py                                 |       25 |        0 |        4 |        0 |    100% |           |
| analytics\_dashboard/courses/permissions.py                                |       78 |        1 |       16 |        2 |     97% |78->83, 109 |
| analytics\_dashboard/courses/presenters/\_\_init\_\_.py                    |      209 |       13 |       50 |        4 |     93% |76->90, 124, 129->158, 148->156, 230-232, 258, 264, 268, 302-307 |
| analytics\_dashboard/courses/presenters/course\_summaries.py               |       53 |        1 |       16 |        2 |     96% |20, 35->37 |
| analytics\_dashboard/courses/presenters/engagement.py                      |      182 |        4 |       66 |        9 |     95% |83, 96, 115, 120->exit, 128->121, 139->142, 149->152, 150->149, 171, 212->220 |
| analytics\_dashboard/courses/presenters/enrollment.py                      |      264 |        4 |       76 |       11 |     96% |207->236, 295->301, 312, 348->355, 383, 384->378, 390-392, 455->463, 512->519, 541->548 |
| analytics\_dashboard/courses/presenters/performance.py                     |      331 |       21 |      108 |       14 |     92% |54-57, 71, 159-161, 187->198, 231-232, 246->exit, 248->exit, 269->290, 273->279, 309->318, 318->exit, 366->365, 368, 410, 414, 422, 431-432, 437, 445, 448, 504-505, 520->522, 601->603 |
| analytics\_dashboard/courses/presenters/programs.py                        |       25 |        0 |        6 |        1 |     97% |    33->39 |
| analytics\_dashboard/courses/serializers.py                                |        8 |        1 |        2 |        1 |     80% |        15 |
| analytics\_dashboard/courses/tests/\_\_init\_\_.py                         |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/courses/tests/factories.py                            |      216 |        3 |       80 |        6 |     97% |285-286, 295->304, 354->358, 355->354, 363, 465->471 |
| analytics\_dashboard/courses/tests/test\_presenters/\_\_init\_\_.py        |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/courses/tests/test\_views/\_\_init\_\_.py             |      221 |        6 |       28 |        3 |     95% |55, 70, 324, 389-391 |
| analytics\_dashboard/courses/tests/utils.py                                |      273 |        4 |       46 |        1 |     98% |448-449, 847-848 |
| analytics\_dashboard/courses/urls.py                                       |       23 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/courses/utils.py                                      |       42 |        0 |        6 |        0 |    100% |           |
| analytics\_dashboard/courses/views/\_\_init\_\_.py                         |      347 |       38 |       78 |       14 |     86% |86->97, 93-95, 101-140, 174, 189, 246-249, 404->408, 509, 541->553, 612, 625->681, 647, 696->728, 721, 732->743, 743->751, 774 |
| analytics\_dashboard/courses/views/course\_summaries.py                    |       63 |        0 |       12 |        1 |     99% |    64->69 |
| analytics\_dashboard/courses/views/csv.py                                  |       73 |        4 |        0 |        0 |     95% |109-110, 117-118 |
| analytics\_dashboard/courses/views/engagement.py                           |      101 |        0 |        2 |        0 |    100% |           |
| analytics\_dashboard/courses/views/enrollment.py                           |      136 |        0 |        2 |        0 |    100% |           |
| analytics\_dashboard/courses/views/performance.py                          |      217 |        4 |       24 |        4 |     97% |67->79, 257, 445, 483-484 |
| analytics\_dashboard/courses/waffle.py                                     |        4 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/formats/\_\_init\_\_.py                               |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/formats/en/\_\_init\_\_.py                            |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/formats/en/formats.py                                 |        2 |        2 |        0 |        0 |      0% |       1-2 |
| analytics\_dashboard/help/\_\_init\_\_.py                                  |        1 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/help/middleware.py                                    |       13 |        1 |        4 |        1 |     88% |        18 |
| analytics\_dashboard/help/utils.py                                         |       12 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/help/views.py                                         |        7 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/settings/\_\_init\_\_.py                              |        0 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/settings/base.py                                      |      119 |        0 |        0 |        0 |    100% |           |
| analytics\_dashboard/settings/dev.py                                       |       24 |       24 |        2 |        0 |      0% |      3-93 |
| analytics\_dashboard/settings/devstack.py                                  |       21 |       21 |        2 |        0 |      0% |      3-45 |
| analytics\_dashboard/settings/local.py                                     |       21 |       21 |        0 |        0 |      0% |      3-51 |
| analytics\_dashboard/settings/logger.py                                    |       18 |        3 |        6 |        3 |     75% |30, 41, 91 |
| analytics\_dashboard/settings/production.py                                |       15 |       15 |        6 |        0 |      0% |      3-43 |
| analytics\_dashboard/settings/yaml\_config.py                              |       13 |       13 |        0 |        0 |      0% |      1-23 |
| analytics\_dashboard/urls.py                                               |       23 |        8 |        6 |        1 |     55% |42, 46, 50-65 |
| common/\_\_init\_\_.py                                                     |        0 |        0 |        0 |        0 |    100% |           |
| common/clients.py                                                          |       31 |       17 |        4 |        0 |     40% |     23-50 |
| common/course\_structure.py                                                |       58 |        0 |       28 |        2 |     98% |28->33, 34->38 |
| common/tests/\_\_init\_\_.py                                               |        0 |        0 |        0 |        0 |    100% |           |
| common/tests/course\_fixtures.py                                           |       68 |        1 |        4 |        0 |     99% |        20 |
| common/tests/factories.py                                                  |       73 |        0 |        6 |        0 |    100% |           |
|                                                                  **TOTAL** | **3710** |  **259** |  **738** |   **81** | **91%** |           |


## Setup coverage badge

Below are examples of the badges you can use in your main branch `README` file.

### Direct image

[![Coverage badge](https://raw.githubusercontent.com/edx/edx-analytics-dashboard/python-coverage-comment-action-data/badge.svg)](https://htmlpreview.github.io/?https://github.com/edx/edx-analytics-dashboard/blob/python-coverage-comment-action-data/htmlcov/index.html)

This is the one to use if your repository is private or if you don't want to customize anything.

### [Shields.io](https://shields.io) Json Endpoint

[![Coverage badge](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/edx/edx-analytics-dashboard/python-coverage-comment-action-data/endpoint.json)](https://htmlpreview.github.io/?https://github.com/edx/edx-analytics-dashboard/blob/python-coverage-comment-action-data/htmlcov/index.html)

Using this one will allow you to [customize](https://shields.io/endpoint) the look of your badge.
It won't work with private repositories. It won't be refreshed more than once per five minutes.

### [Shields.io](https://shields.io) Dynamic Badge

[![Coverage badge](https://img.shields.io/badge/dynamic/json?color=brightgreen&label=coverage&query=%24.message&url=https%3A%2F%2Fraw.githubusercontent.com%2Fedx%2Fedx-analytics-dashboard%2Fpython-coverage-comment-action-data%2Fendpoint.json)](https://htmlpreview.github.io/?https://github.com/edx/edx-analytics-dashboard/blob/python-coverage-comment-action-data/htmlcov/index.html)

This one will always be the same color. It won't work for private repos. I'm not even sure why we included it.

## What is that?

This branch is part of the
[python-coverage-comment-action](https://github.com/marketplace/actions/python-coverage-comment)
GitHub Action. All the files in this branch are automatically generated and may be
overwritten at any moment.