# Agent LifeLine Dashboard: Metrics Guide

This guide details all calculation rules, equations, and definitions for the metrics, grids, charts, and timeline widgets across every section of the dashboard.

---

## 1. Overview Section

The **Overview** dashboard presents aggregated team-wide metrics for the selected day:

*   **Margin Generated today (£)**: 
    *   *Formula:* $\sum \text{Margin Contributed Today}$ of all active agents.
    *   *Data Source:* Opportunities CSV (Lead Value / Margin Amount column).
*   **Total Leads Assigned**: 
    *   *Formula:* $\sum \text{Assigned Opportunities}$ across all agents.
    *   *Data Source:* Opportunities CSV (row allocation by Assigned User).
*   **Active Sprints**: 
    *   *Definition:* Count of agents with at least 1 logged update/activity in audit logs on the selected date.
*   **Avg Daily Team Conv (%)**: 
    *   *Formula:* $\left( \frac{\sum \text{Booked Leads Today}}{\sum \text{Eligible Opportunities Today}} \right) \times 100$
    *   *Eligible Opportunities Today* = Total Opportunities Assigned - Closed Leads - Appointment Booked Leads.
*   **Lead Segmentations Sums**:
    *   *New Leads:* Total count of opportunities assigned plus unique contacts interacted with.
    *   *Referrals:* Sum of leads designated as a referral on the selected date.
    *   *Booked Leads:* Sum of leads marked in a "Booked" status.
    *   *Appointment Booked:* Sum of leads marked in an "Appointment Booked" status.
    *   *Closed Leads:* Sum of leads marked in a "Won", "Closed", or "Lost" status.
*   **Source Distribution**:
    *   A breakdown of lead count grouped by the lead's acquisition origin channel (e.g., Facebook, Organic, Referral).

---

## 2. Activity & Metrics Section (The 18 Cards Grid)

When selecting `"All Agents"` or a specific agent, the dashboard calculates eighteen metric KPIs:

### Engagement & Activity KPIs
1.  **Today Interacted Leads**: Unique count of all contacts messaged, called, or modified/updated in CRM audit logs today.
2.  **Total Conversations**: Count of unique phone number profiles the agent exchanged outbound GHL text messages with today.
3.  **Total Calls Placed**: Sum of outbound and inbound call logs registered today.
4.  **Missed Inbound Calls**: Inbound calls with status other than "Answered".
5.  **Notes Added**: Audit logs of type `NOTE` with action `CREATED`.
6.  **Tasks Added**: Audit logs of type `TASK` with action `CREATED`.
7.  **Total Actions**: Total count of all log actions (Note creation, Task additions, Opportunity stage changes) performed today.

### CRM Stages & Conversions
8.  **Interested Stage**: Number of opportunities moved to the "Interested" pipeline stage.
9.  **Contacted Stage**: Number of opportunities moved to the "Contacted" pipeline stage.
10. **Today's New Leads**: The number of new leads assigned to the agent extracted directly from the uploaded New Leads CSV file.
11. **Today's Referrals**: Opportunities marked as a referral.
12. **Booked Leads**: All booked leads rows for the agent in the uploaded Booked Leads sheet.
13. **Closed Leads**: All closed leads rows for the agent in the uploaded Closed Leads sheet.
14. **Appointment Booked**: All appointment booked leads rows for the agent in the uploaded Appointment Booked sheet.
15. **General Conversion Rate (%)**: 
    *   *Formula:* $\left( \frac{\text{Booked Leads Today}}{\text{Total Interacted Leads Today}} \right) \times 100$
16. **Booked Lead Rate (%)**:
    *   *Formula:* $\left( \frac{\text{Booked Leads Today}}{\text{Today's New Leads}} \right) \times 100$
17. **Closed Lead Rate (%)**:
    *   *Formula:* $\left( \frac{\text{Closed Leads Today}}{\text{Today's New Leads}} \right) \times 100$
18. **Margin Contributed Today (£)**: Total revenue value of opportunities won or credited on the selected date.

---

## 3. Progression Charts Section

This tab renders agent performance rankings for today's KPIs:
*   **New Leads**: Today's New Leads per agent.
*   **Referrals**: Today's Referrals per agent.
*   **Booked Leads**: Today's Booked Leads count per agent.
*   **Appointment Booked Leads**: Today's Appointment Booked Leads count per agent.
*   **Closed Leads**: Today's Closed Leads count per agent.
*   **Margin Contributed Today (£)**: Total monetary margin (£) added per agent today.

---

## 4. Visual Scatter Workday Timeline Section

A visual activity plot mapping events across hours (BST) to inspect agent workday density:
*   **Circles (Light Blue-Purple)**: CRM audit updates (Notes, Task creation, Stage changes).
*   **Small Dots (Sky Blue)**: Outbound GHL text message actions.
*   **Triangles (Orange)**: Calls placed. Solid color indicates Answered, hollow/grey outlines indicate missed/unattended.

---

## 5. Summary Tables Section

*   **Table 1: Main Agent Conversion & Lead Metrics**:
    Summarizes each agent's general performance. Includes `New Leads`, `Referrals`, `Appt Booked`, `Closed`, `Booked`, `Margin`, `Interested`, `Contacted`, `Notes`, and `General Conversion (%)`.
*   **Table 2: Today's New Leads Conversion Sprints**:
    Tracks immediate day-of conversion velocity. Shows `Today's New Leads`, `Today's Referrals`, `Today's Converted`, and `Today's Conversion Rate (%)`.
*   **Table 3: Voice Call Operations & Call Duration Metrics**:
    Detailed call log diagnostics including `Outbound Calls Count`, `Outbound Answered Count`, `Outbound Missed Count`, `Total Outbound Call Duration (Mins)`, `Average Outbound Call Duration (Mins)`, and identical variables for `Inbound Calls`.
