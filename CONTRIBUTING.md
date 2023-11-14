# Contributing

This is a living document representing some guidelines that will help our team do great work, and keep consistency in the codebase and the systems over time.

## Code Quality Principles

- `Naming` → Explicitness, brevity, and consistency.
- `Commenting` → Exist to help future readers (including yourself).
- `Testing`:
    - Code isn’t high quality without tests.
    - Unit testing is a baseline tool for sustainable engineering.
    - Tests should be fast. Inject dependencies to favor decoupling.
    - Run tests often. Main should always be green.
- `Cleverness` → Favor explicitness and simplicity over cleverness. Make things easier to maintain.
- `Code Reviews are mandatory`:
    - Is it correct?
    - Is it clear?
    - Is it consistent with the codebase?
    - Is it tested?
    - Be polite. We are humans and we all play for the same team.
    
### Style Guides

Follow styleguides whenever possible

- [PEP 8 – Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [JavaScript Standard Style](https://standardjs.com/rules)

## Git Strategy

We follow the [Github flow](https://githubflow.github.io/) strategy based on it's simplicity. The only difference is that our principal branch is called `main` instead of `master`.

All the changes to the codebase must be reviewed by our peers before merging to the `main` branch.

We keep the `main` branch always `green` by ensuring the new changes don't break previous functionality.

## Testing Strategy

For now, we will value unit-testing over every other form of tests. We should strive to always test the business logic of the new changes while not breaking the previously coded unit tests.

In the future, we will introduce other forms of testing (UI, Snapshot, Integration testing, etc).

## Coding Conventions

We have a formatter and a linter set up in the repository that will enforce must of the conventions. Checkout the rules we have by looking at the `.github/workflows/tests.yml`.

