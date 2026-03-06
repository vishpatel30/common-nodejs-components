# Contributing to dataverse-infra repository

First off, thanks for taking the time to contribute!

Please follow the below guidelines while contributing. For any suggestions or
improvement, create a pull request as per below process

## Code Contribution

Prerequisites [Mandatory] :- You should have pre-commit installed from wherever you are commiting the code and the corresponding tools required by precommit. For this repo

- [pre-commit](https://pre-commit.com/)
- [terraform](https://www.terraform.io/downloads.html)
- [terragrunt](https://terragrunt.gruntwork.io/docs/getting-started/install/)
- [checkov](https://www.checkov.io/1.Welcome/Quick%20Start.html)
- [golang](https://golang.org/)
- [awslabs/git-secrets](https://github.com/awslabs/git-secrets)

To add your contribution please do a pull request. We follow the fork and
branch workflow to make contributions to Github.

Example workflow for contributions:

- [Fork](https://help.github.com/en/articles/fork-a-repo) GitHub repository
into committer Github account

- Clone the forked repository to your local system (to be named as `origin`)
    ```bash
    # replace shivam-maf with your Github username
    git clone git@github.com:shivam-maf/dataverse-infra.git
    ```

- Add a Git remote for the original repository (to be named as `upstream`)
    ```bash
    git remote add upstream git@github.com:dataverse/dataverse-infra.git
    ```
    - In case the repository was already forked, update the develop branch
        ```bash
        # change current branch to master
        git checkout master
        # Pull latest changes from upstream
        git pull upstream master
        # Push latest changes to origin
        git push origin master
        ```

- Create a feature branch from **master branch** in which to place your
changes. Your feature branch must be forked from `main` and should only have
feature specific changes and no other changes
    ```bash
    # replace GRIDX-NNN with the JIRA issue number
    git checkout -b GRIDX-NNN/small-jira-issue-header
    ```

- Make your code changes to the new branch

- Commit the changes to the branch. Make sure that your changes are alinged
with [editor config file](../.editorconfig).
    ```bash
    git commit -am 'GRIDX-NNN(small-jira-issue-header): Adding awesomenss'
    ```

- Push the branch to GitHub
    ```bash
    git push origin GRIDX-NNN/small-jira-issue-header
    ```

- [Create a new pull request](https://help.github.com/en/articles/creating-a-pull-request)
from the new branch to the original repo to merge
`origin:GRIDX-NNN/small-jira-issue-header` (right side) on `upstream:develop`
(left side) while adhering to the checklist and guidelines

- The code need to be tested on dev environment. Once approved by QA, the
feature branch will be merged to **`main`** branch.

- In case of any bug in the feature, the developer needs to make the fixes in the feature branch and merge the fixes on dev environment. On QA signoff the feature will be merged into **`main`** branch

## Pull request template

We need to adhere to checklist below for each pull request. This has also been
defined in the [pull request template](./pull_request_template.md)

- Title of the PR includes description and is not absurd. Optionally, Jira
tag should be added to indicate task information e.g. `[GRIDX-NNN]`
- Ensure request is to **pull a `GRIDX-NNN/topic` branch** (right side)
- Ensure pull request is against the **`develop` branch** (left side)
- Check the commit message styles matches our requested structure
- Branch has **latest code pulled from `main`**
- **Assigned** myself to the PR
- Added **labels** to the PR
- Assigned >= 2 people to **reviewers the PR**
- **Documentation** has been written where necessary

## Styleguides

Terraform :- https://www.terraform.io/docs/language/syntax/style.html



### Git Commit Messages
We are following
[The seven rules of a great Git commit message](https://chris.beams.io/posts/git-commit/#seven-rules)
by Chris Beams. Please, read them before you start to contribute. Briefly
they are:

- Separate subject from body with a blank line
- Limit the subject line to 50 characters
- Capitalize the subject line
- Do not end the subject line with a period
- Use the imperative mood in the subject line
- Wrap the body at 72 characters
- Use the body to explain what and why vs. how
