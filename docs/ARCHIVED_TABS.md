/**
 * ARCHIVED TABS - AdminServiceBuilderPage (May 27, 2026)
 * 
 * These tabs were removed from AdminServiceBuilderPage to avoid duplication
 * with the new AdminLearningGuide component and consolidated Examples tab.
 * This file documents what was archived and why.
 * 
 * RATIONALE FOR REMOVAL:
 * 1. AdminLearningGuide (Tab 2) provides comprehensive education on all 6 envelopes
 * 2. Duplicate Envelope Guide tab (was Tab 4) removed - use Learning Guide instead
 * 3. Duplicate Quick Reference tab (was Tab 6) removed - content consolidated
 * 4. Examples tab updated with 4 new examples matching SERVICE_DEFINITION_RULES.yaml
 * 
 * NEW TAB STRUCTURE (POST-CLEANUP):
 * ============================================================================
 * - Tab 0: Builder (service YAML editor with validation)
 * - Tab 1: Manage Services (list existing services, edit, delete)
 * - Tab 2: Learning Guide (comprehensive guide - 4 tabs of education)
 *   - Learning Guide Tab 0: Parameter Types (all 7 types explained)
 *   - Learning Guide Tab 1: Envelope Guide (all 6 envelopes with details)
 *   - Learning Guide Tab 2: Common Mistakes (wrong vs right patterns)
 *   - Learning Guide Tab 3: Quick Reference (cheatsheet)
 * - Tab 3: YAML Structure Guide (quick template + 6 envelopes overview)
 * - Tab 4: Examples (4 production-ready services)
 *   - Transcript of Records (Advanced)
 *   - Clinic Visit Appointment (Simple)
 *   - On-Campus Housing Rental (Advanced)
 *   - Course Withdrawal Request (Intermediate)
 * - Tab 5: Email Templates (Enhanced WYSIWYG editor)
 * 
 * ARCHIVED CONTENT REFERENCE:
 * ============================================================================
 * 
 * CONTENT 1: ENVELOPE GUIDE (VISUAL CARDS)
 * Originally: Tab 4, index={4}
 * Status: MOVED to AdminLearningGuide Tab 1
 * Content: 6 colored cards explaining each envelope
 * Reason: Prevents duplication - AdminLearningGuide has same content
 * 
 * CONTENT 2: QUICK REFERENCE TABLES
 * Originally: Tab 6, index={6}
 * Status: REMOVED
 * Content: 
 * - Approval Types table
 * - Processing Task Types table
 * - Common Parameter Types
 * - Symbols reference
 * Reason: Consolidated into YAML Structure Guide + Examples tab
 * 
 * CONTENT 3: OLD EXAMPLES (PRE-UPDATE)
 * Originally: Tab 5 (old index 5)
 * Status: REPLACED with new examples
 * Old Format: Using 'id' field instead of 'serviceId'
 * Old Examples:
 * 1. Transcript of Records (id: SERV-3-05262026)
 * 2. Clinic Visit Request
 * 3. Room Rental Service
 * 
 * New Examples (SERVICE_DEFINITION_RULES.yaml compliant):
 * 1. Transcript of Records (serviceId: SERV-001)
 * 2. Clinic Visit Appointment (serviceId: SERV-002)
 * 3. On-Campus Housing Rental (serviceId: SERV-003)
 * 4. Course Withdrawal Request (serviceId: SERV-004)
 * 
 * Changes in Format:
 * - 'id' → 'serviceId' with SERV-### format
 * - 'initiator' field removed (not in SERVICE_DEFINITION_RULES)
 * - Parameters now use full schema (type, required, constraints)
 * - Approval rules use direct 'type' field
 * - Processing tasks use full structure { name, type, method, url }
 * - Delivery email includes 'subject' template
 * 
 * All new examples validate against SERVICE_DEFINITION_RULES.yaml
 * 
 * ============================================================================
 * MIGRATION NOTES:
 * 
 * If you need to restore old content:
 * 1. Check git history for previous versions
 * 2. AdminLearningGuide component has the envelope guide content
 * 3. Old examples can be found in git commit history
 * 4. Current Examples tab has more detailed, spec-compliant examples
 * 
 * ============================================================================
 */
