import nodemailer from 'nodemailer';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      return null;
    }
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });
    }
    return this.transporter;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      logger.warn('[Notifications] SMTP not configured. Skipping email send.');
      return;
    }
    try {
      await transporter.sendMail({ from: process.env.FROM_EMAIL || 'noreply@kreativicon.com', to, subject, html: body });
      logger.info(`[Notifications] Email sent to ${to}: ${subject}`);
    } catch (err) {
      logger.error('[Notifications] Failed to send email:', err);
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<void> {
    logger.warn(`[Notifications] WhatsApp not configured yet. To: ${to}, Message: ${message.substring(0, 50)}...`);
    // TODO: Integrate WhatsApp Business API or Twilio here
  }

  async notifyShipmentStatusChange(shipment: any, customer: { email?: string | null; companyName: string }, newStatus: string): Promise<void> {
    const templates: Record<string, { subject: string; body: string }> = {
      BOOKED: { subject: `Shipment ${shipment.shipmentNumber} Booked`, body: `Dear ${customer.companyName},<br><br>Your shipment <strong>${shipment.shipmentNumber}</strong> has been successfully booked.<br>Route: ${shipment.origin} → ${shipment.destination}<br><br>We will keep you updated on the progress.<br><br>Regards,<br>Kreativ Icon Logistics Team` },
      PICKED_UP: { subject: `Shipment ${shipment.shipmentNumber} Picked Up`, body: `Dear ${customer.companyName},<br><br>Your cargo for shipment <strong>${shipment.shipmentNumber}</strong> has been picked up and is now in our possession.<br><br>Regards,<br>Kreativ Icon Logistics Team` },
      IN_TRANSIT: { subject: `Shipment ${shipment.shipmentNumber} In Transit`, body: `Dear ${customer.companyName},<br><br>Your shipment <strong>${shipment.shipmentNumber}</strong> is now in transit from ${shipment.origin} to ${shipment.destination}.<br>${shipment.eta ? `Estimated Arrival: ${shipment.eta.toLocaleDateString()}` : ''}<br><br>Regards,<br>Kreativ Icon Logistics Team` },
      CUSTOMS: { subject: `Shipment ${shipment.shipmentNumber} - Customs Processing`, body: `Dear ${customer.companyName},<br><br>Your shipment <strong>${shipment.shipmentNumber}</strong> is currently undergoing customs clearance. Our team is handling all documentation.<br><br>Regards,<br>Kreativ Icon Logistics Team` },
      CUSTOMS_CLEARED: { subject: `Shipment ${shipment.shipmentNumber} - Customs Cleared`, body: `Dear ${customer.companyName},<br><br>Great news! Your shipment <strong>${shipment.shipmentNumber}</strong> has successfully cleared customs and will proceed to its next destination.<br><br>Regards,<br>Kreativ Icon Logistics Team` },
      OUT_FOR_DELIVERY: { subject: `Shipment ${shipment.shipmentNumber} - Out for Delivery`, body: `Dear ${customer.companyName},<br><br>Your shipment <strong>${shipment.shipmentNumber}</strong> is out for delivery today. Please ensure someone is available to receive it.<br><br>Regards,<br>Kreativ Icon Logistics Team` },
      DELIVERED: { subject: `Shipment ${shipment.shipmentNumber} Delivered ✓`, body: `Dear ${customer.companyName},<br><br>Your shipment <strong>${shipment.shipmentNumber}</strong> has been successfully delivered. Thank you for choosing Kreativ Icon Logistics!<br><br>We look forward to serving you again.<br><br>Regards,<br>Kreativ Icon Logistics Team` },
    };

    const template = templates[newStatus];
    if (template && customer.email) {
      await this.sendEmail(customer.email, template.subject, template.body);
    }

    await this.saveNotification({ email: customer.email || undefined, channel: 'EMAIL', subject: template?.subject, message: template?.body || `Shipment ${shipment.shipmentNumber} status updated to ${newStatus}`, status: customer.email ? 'SENT' : 'PENDING' });
  }

  async saveNotification(data: { userId?: string; email?: string; channel: string; subject?: string; message: string; status: string }): Promise<void> {
    try {
      await prisma.notification.create({
        data: { userId: data.userId, email: data.email, channel: data.channel as 'EMAIL' | 'WHATSAPP' | 'SMS' | 'IN_APP', subject: data.subject, message: data.message, status: data.status as 'PENDING' | 'SENT' | 'FAILED' | 'READ', sentAt: data.status === 'SENT' ? new Date() : undefined },
      });
    } catch (err) {
      logger.error('[Notifications] Failed to save notification:', err);
    }
  }
}

export const notificationService = new NotificationService();
