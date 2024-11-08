FROM ubuntu:focal as app

ENV DEBIAN_FRONTEND noninteractive

ARG PYTHON_VERSION=3.8

# Packages installed:

# pkg-config; mysqlclient>=2.2.0 requires pkg-config (https://github.com/PyMySQL/mysqlclient/issues/620)

RUN apt-get update && \
  apt-get install -y software-properties-common && \
  apt-add-repository -y ppa:deadsnakes/ppa && \
  apt-get install --no-install-recommends -qy \
  language-pack-en \
  build-essential \
  python${PYTHON_VERSION}-dev \
  python${PYTHON_VERSION}-distutils \
  libmysqlclient-dev \
  pkg-config \
  libssl-dev \
  # needed by phantomjs
  libfontconfig \
  # needed by i18n tests in CI
  gettext \
  # needed by a11y tests script
  curl \
  # needed to install github based dependency
  git && \
  rm -rf /var/lib/apt/lists/*

RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# ENV variables lifetime is bound to the container whereas ARGS variables lifetime is bound to the image building process only
# Also ARGS provide us an option of compatibility of Path structure for Tutor and other OpenedX installations
ARG COMMON_CFG_DIR "/edx/etc"
ARG COMMON_APP_DIR="/edx/app"
ARG INSIGHTS_APP_DIR="${COMMON_APP_DIR}/insights"
ARG INSIGHTS_VENV_DIR="${COMMON_APP_DIR}/insights/venvs/insights"
ARG INSIGHTS_CODE_DIR="${INSIGHTS_APP_DIR}/edx_analytics_dashboard"
ARG INSIGHTS_NODEENV_DIR="${COMMON_APP_DIR}/insights/nodeenvs/insights"

ENV PATH "${INSIGHTS_VENV_DIR}/bin:${INSIGHTS_NODEENV_DIR}/bin:$PATH"
ENV INSIGHTS_APP_DIR ${INSIGHTS_APP_DIR}
ENV THEME_SCSS "sass/themes/open-edx.scss"
ENV PYTHON_VERSION "${PYTHON_VERSION}"

RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python${PYTHON_VERSION}
RUN pip install virtualenv

# No need to activate insights virtualenv as it is already activated by putting in the path
RUN virtualenv -p python${PYTHON_VERSION} --always-copy ${INSIGHTS_VENV_DIR}

COPY requirements ${INSIGHTS_CODE_DIR}/requirements

ENV PATH="${INSIGHTS_CODE_DIR}/node_modules/.bin:$PATH"

WORKDIR ${INSIGHTS_CODE_DIR}/

# insights service config commands below
RUN pip install  --no-cache-dir -r ${INSIGHTS_CODE_DIR}/requirements/production.txt 

RUN nodeenv ${INSIGHTS_NODEENV_DIR} --node=20.15.1 --prebuilt \
  && npm install -g npm@10.7.x

# Tried to cache the dependencies by copying related files after the npm install step but npm post install fails in that case.
COPY . ${INSIGHTS_CODE_DIR}/
RUN npm set progress=false && npm ci

EXPOSE 8110
EXPOSE 18110

FROM app as dev

RUN pip install --no-cache-dir -r requirements/local.txt

ENV DJANGO_SETTINGS_MODULE "analytics_dashboard.settings.devstack"

# Backwards compatibility with devstack
RUN touch "${INSIGHTS_APP_DIR}/insights_env" 

CMD while true; do python ./manage.py runserver 0.0.0.0:8110; sleep 2; done

FROM app as prod

ENV DJANGO_SETTINGS_MODULE "analytics_dashboard.settings.production"

CMD gunicorn \
  --pythonpath=/edx/app/insights/edx_analytics_dashboard/analytics_dashboard \
  --timeout=300 \
  -b 0.0.0.0:8110 \
  -w 2 \
  - analytics_dashboard.wsgi:application
