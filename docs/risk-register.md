# Project Risk Register — RepairFlow

| Risk                          | Probability | Impact   | Prevention                           | Mitigation                        | Recovery                         |
| :---------------------------- | :---------- | :------- | :----------------------------------- | :-------------------------------- | :------------------------------- |
| Cross-branch data exposure    | Medium      | Critical | Branch guards and tests              | Disable affected access           | Audit and correct permissions    |
| Incorrect invoice calculation | Medium      | High     | Central calculation service          | Block invoice finalisation        | Recalculate and issue correction |
| Token leakage                 | Low         | Critical | Hash tokens and use expiry           | Revoke sessions                   | Generate replacement tokens      |
| Database loss                 | Low         | Critical | Automated backups                    | Stop writes                       | Restore latest verified backup   |
| Scope creep                   | High        | High     | Freeze Version 1                     | Move extras to roadmap            | Re-plan milestones               |
| Dependency vulnerabilities    | Medium      | High     | Regular `npm audit` & updates        | Isolate affected module           | Patch to secure versions         |
| Third-party API failure       | Medium      | Medium   | Implement circuit breakers & retries | Fallback to offline/cached states | Re-sync data when online         |
| Malicious file upload         | Low         | Critical | File type & size validation          | Quarantine uploaded files         | Delete and purge logs            |
| Denial of service (DDoS)      | Low         | High     | Rate limiting & Cloudflare           | Block malicious IPs               | Scale up resources               |
| Technician account takeover   | Low         | High     | Enforce strong passwords & 2FA       | Lock out technician               | Reset credentials                |
