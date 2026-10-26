# Security, Privacy and Regulatory Boundaries

## Prototype truth

The single-file browser app is not secure for real institutional data. Its role selector, localStorage state, sample users and client-side buttons can be changed by the browser user. The prototype is only for synthetic demo records.

## Production requirements

- Authenticate users with an approved identity provider; use server-side authorization for every request.
- Apply least privilege and institution/region/case scoping. Enforce authorization on object IDs to prevent IDOR-style access.
- Separate role capabilities: institutions submit/observe their records; scrutiny roles perform allowed scrutiny actions; EVC roles manage eligible visit tasks; reviewers verify evidence; competent authority makes reserved decisions; admins manage policy only within authority.
- Store secrets in environment/secret management, never source control. Rotate and revoke exposed secrets.
- Validate inputs and route transitions server-side; use CSRF-safe sessions or proper token flows, output encoding, rate limits and dependency updates.
- Upload controls: allowlisted file types, size limits, MIME/content verification, malware scanning where feasible, encrypted storage, scoped downloads and access logs.
- Encrypt traffic and sensitive stored data; minimize personal information and redact logs.
- Log authentication, access-denial, data export, rule changes, evidence review and workflow transitions; avoid logging full sensitive document contents.
- Audit records should be append-only to application identities, query-controlled and retained according to the applicable approved policy.
- Protect notification endpoints; prevent injection, recipient spoofing and excessive messages. Keep delivery outcomes visible.
- Use backup/restore, incident response, access review, monitoring, rate limiting and vulnerability management before production.

## Human oversight

- No model should autonomously grant/reject an application or substitute for statutory scrutiny, inspection or competent authority decisions.
- AI/OCR findings must be advisory, explain uncertainty, link to the source evidence/page/region and support human confirmation/correction.
- Do not infer legal non-compliance from OCR alone. Missing or conflicting fields create review tasks, not automatic adverse decisions.

## Regulatory configuration

Use only verified, currently applicable official rules and circulars. Store source citation, rule version, effective date, owner and approval history with policy. A demo rule threshold is not a legal claim. Any official-system integration must be authorized and documented; do not scrape or impersonate official interfaces.

## Privacy by design

Use synthetic records for hackathon judging. Avoid real names, personal identifiers, institution confidential documents, credentials, private emails and phone numbers. Define purpose, access scope, retention and deletion before handling real data.
