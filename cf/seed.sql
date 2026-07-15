-- Seed data for testing
-- Run: wrangler d1 execute manyme-db --file=./seed.sql --remote

-- Create OpenAI group
INSERT INTO groups (id, name, description, priority, enabled)
VALUES ('seed-openai-001', 'OpenAI', 'OpenAI verification codes', 10, 1);

-- Match rules for OpenAI
INSERT INTO match_rules (id, group_id, field, operator, pattern)
VALUES ('seed-om-001', 'seed-openai-001', 'sender', 'contains', '@openai.com');

INSERT INTO match_rules (id, group_id, field, operator, pattern)
VALUES ('seed-om-002', 'seed-openai-001', 'subject', 'contains', 'verification');

-- Extract rules for OpenAI
INSERT INTO extract_rules (id, group_id, field_name, source, pattern)
VALUES ('seed-oe-001', 'seed-openai-001', 'code', 'html', '<span class="code">~</span>');

-- Response template for OpenAI
INSERT INTO response_templates (id, group_id, template)
VALUES ('seed-ot-001', 'seed-openai-001', '{"platform":"openai","code":"{{code}}","sender":"{{from}}"}');

-- Create Cursor group
INSERT INTO groups (id, name, description, priority, enabled)
VALUES ('seed-cursor-001', 'Cursor', 'Cursor verification codes', 9, 1);

INSERT INTO match_rules (id, group_id, field, operator, pattern)
VALUES ('seed-cm-001', 'seed-cursor-001', 'sender', 'contains', '@cursor.com');

INSERT INTO extract_rules (id, group_id, field_name, source, pattern)
VALUES ('seed-ce-001', 'seed-cursor-001', 'code', 'text', 'is: ~');

INSERT INTO response_templates (id, group_id, template)
VALUES ('seed-ct-001', 'seed-cursor-001', '{"service":"cursor","code":"{{code}}"}');
