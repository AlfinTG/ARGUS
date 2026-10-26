---
name: Feature request
description: Track an ARGUS requirement with acceptance criteria
labels: [enhancement]
body:
  - type: textarea
    id: requirement
    attributes:
      label: Requirement
      description: Link to the ARGUS source document and requirement ID.
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      description: Describe visible, testable outcomes.
    validations:
      required: true
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      options: [P0, P1, P2]
    validations:
      required: true
  - type: textarea
    id: risks
    attributes:
      label: Risks, assumptions and dependencies
