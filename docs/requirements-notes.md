# Requirements notes and working assumptions

## Sources reviewed

- The supplied presentation contains the readable feature requirements and use cases.
- The supplied SRS PDF has 25 pages, but text extraction returned no content on the pages checked. Only two embedded images were found: the school seal and a use-case diagram. It does not provide a readable full requirements set, so the presentation is the usable source until a complete SRS is available.
- The NGS ZIP is a visual and workflow reference. Its implementation is not being copied. Its bundled environment file and dependencies are not project inputs.

## Confirmed roles and workflows

- **Parents** view records only for linked children, receive announcements and notifications, and message teachers assigned to those children.
- **Teachers** see only assigned classes, record daily attendance, enter grades, submit behavior reports, and respond to parent messages.
- **Administrators** manage accounts and access, review behavior reports, send announcements, upload/import data, review activity, and generate reports.
- Students are the records' subjects; the use cases do not define student logins.
- Attendance states are present, absent, late, and excused. Repeated entries for the same student/class/date must be rejected or handled explicitly.
- Grades are recorded by subject and assessment. Administrative reports may calculate averages and rankings when requested.
- Behavior reports should pass administrative review before parents can see them. This follows the detailed workflow that says reports are reviewed before parent visibility.
- Announcements can target all parents, classes, or individuals. The system should queue notification work if a delivery service is unavailable.
- Attendance, academic performance, and behavior reports support administrative review and a selected date range.

## Quality and integration requirements

- Support 500+ concurrent users; target login/page loads below 3 seconds, class attendance/grade updates below 5 seconds, and ordinary report queries within 1-5 seconds (under 10 seconds for large datasets).
- Target 99.5% uptime, backups every four hours, and recovery within 15 minutes. These require deployment and operations work; local development cannot establish the uptime target.
- Provide web/mobile access, cached offline viewing, and offline teacher entry with later synchronization. Conflict handling and duplicate prevention must be designed before offline writes are enabled.
- Use HTTPS in deployment, secure password handling, role-based access, activity logging, and a second factor for administrators. Deployment must configure transport security and managed database encryption/backups.
- The school SIS is expected to provide consistent CSV exports. Import validation and missing-data reporting are planned; a live SIS connection is not specified.

## Decisions and ambiguities

- **MongoDB versus relational tables:** the presentation mentions relational tables, while the user explicitly specifies MongoDB. The implementation will use MongoDB/Mongoose ObjectId references, validation, and unique indexes.
- **Behavior visibility:** the detailed reviewed-before-visible-to-parents use case wins over the broader statement that reports are available to parents after submission.
- **Login identifier:** parent interface requirements mention phone or email, while the general use case says username/password. Start with email/password; support phone login only after account identity and verification rules are defined.
- **Events and assignments:** these appear in the overview but have no detailed use case. Keep them in scope for a later workflow pass after the core records and communication flows.
- **Email/SMS delivery:** credentials and provider are unspecified. In-app notifications will be the first delivery channel; external delivery must be configured through server-side adapters before it is presented as operational.
- **Offline synchronization:** the deck calls for offline support but does not define conflict resolution. Offline writes remain a later phase; no client-side write will be presented as saved until the API confirms it.
- **Two-factor method:** use an authenticator-app TOTP flow for administrators unless the school specifies another factor.
- **Data protection law:** the material requires child-data compliance but does not identify a legal jurisdiction or retention/deletion rules. Keep access narrow and use fictional development data; document jurisdiction-specific controls before deployment.
- **AI:** design service boundaries so future summaries, drafting, translation, or authorized knowledge search can be added, but do not send student data to an AI provider in the core system.