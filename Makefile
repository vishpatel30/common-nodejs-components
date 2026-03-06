# Makefile

MAKEFLAGS += -j2
-include .env
export

CURRENT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
CURRENT_PATH := $(shell pwd)
AMM := ${HOME}/amm
PARENT_DIR := $(shell dirname $(CURRENT_PATH))
# Define Repo details:
ORG_NAME := DATAVERSE
REPO_NAME := TestRepo
TEAM_NAME := tribe-bedrock
TARGET_PATH := ${PARENT_DIR}/${REPO_NAME}

.PHONY: gitCloneBase
gitCloneBase:
	echo ${TARGET_PATH} ${ORG_NAME} ${REPO_NAME} && \
  		mkdir ${TARGET_PATH} && \
		rsync -lva --progress ${CURRENT_PATH}/ ${TARGET_PATH} --exclude .git --exclude node_modules && \
        gh auth login && \
        cd ${TARGET_PATH} && \
        git init -b develop && \
        cd ${PARENT_DIR} && \
        gh repo create ${ORG_NAME}/${REPO_NAME} --private --confirm --team ${TEAM_NAME} && \
        cd ${TARGET_PATH} && \
        git add . && git commit -m "initial commit" && git push --set-upstream origin develop

.PHONY: gitRebase
gitRebase:
	git checkout develop && \
		git pull upstream develop && \
		git push origin develop && \
		git checkout $(CURRENT_BRANCH) && \
		git rebase develop

.PHONY: gitAmmend
gitAmmend:
	git add . && git commit --amend --no-edit && git push --force origin $(CURRENT_BRANCH)

.PHONY: killJava
killJava:
	ps ax | grep java | grep -v 'grep' | cut -d '?' -f1 | xargs kill -9

.PHONY: start
start:
	npm run build && npm run serve

.PHONY: dockerStart
dockerStart:
	docker-compose -f docker/docker-compose.yml rm -svf && docker-compose -f docker/docker-compose.yml up --build

.PHONY: test
test:
	npm test

.PHONY: build
build:
	npm run build
