---
name: Bug report
description: Report a reproducible ARGUS defect
labels: [bug]
body:
  - type: textarea
    id: repro
    attributes:
      label: Reproduction steps
      placeholder: 1. Open ... 2. Choose ... 3. Observe ...
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual behavior
    validations:
      required: true
  - type: textarea
    id: context
    attributes:
      label: Browser, commit, console/test output
