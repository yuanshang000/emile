import { Router, Request, Response } from 'express';
import { saveEmail } from '../services/emails';
import { classifyEmail } from '../services/classifier';
import { extractFromEmail } from '../services/extractor';
import { getExtractRules, getGroup, getResponseTemplate } from '../services/groups';
import { renderTemplate } from '../services/response-builder';

const router = Router();

router.post('/webhook/email', (req: Request, res: Response) => {
  try {
    const { message_id, from, to, subject, body_text, body_html } = req.body;

    if (!from || !to) {
      res.status(400).json({ error: 'Missing required fields: from, to' });
      return;
    }

    const emailData = {
      message_id: message_id || undefined,
      from_addr: from,
      to_addr: to,
      subject: subject || '',
      body_text: body_text || '',
      body_html: body_html || '',
    };

    const classification = classifyEmail(emailData);

    let extractedData: Record<string, string> = {};
    let responseData: Record<string, any> = {};

    if (classification) {
      const rules = getExtractRules(classification.groupId);
      extractedData = extractFromEmail(emailData.body_html, emailData.body_text, rules);

      const template = getResponseTemplate(classification.groupId);
      if (template) {
        responseData = renderTemplate(template.template, extractedData, {
          from_addr: emailData.from_addr,
          to_addr: emailData.to_addr,
          subject: emailData.subject,
          received_at: new Date().toISOString(),
        });
      }
    }

    const saved = saveEmail({
      ...emailData,
      group_id: classification?.groupId ?? null,
      extracted_data: extractedData,
      response_cache: responseData as Record<string, string>,
    });

    res.status(201).json({
      id: saved.id,
      group: classification
        ? { id: classification.groupId, name: classification.groupName }
        : null,
      extracted: extractedData,
      response: responseData,
    });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
