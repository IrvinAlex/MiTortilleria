import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  // Reemplaza estos valores con los que obtuviste de EmailJS
  private serviceId = 'service_vjjzdvp';     
  private templateId = 'template_xkvmkoj';    // ← Aquí pones tu Template ID real
  private publicKey = 'Ru03T_4didvjZc2Wm';     // De "API Keys"

  constructor() {
    // Inicializar EmailJS
    emailjs.init(this.publicKey);
  }

  async sendOrderConfirmationEmail(orderData: any): Promise<any> {
    try {
      const templateParams = {
        to_email: orderData.customerEmail,
        from_name: 'Tortillería Plata Jaimes',
        subject: `Confirmación de Pedido #${orderData.orderId} - Tortillería Plata Jaimes`,
        html_content: this.generateCustomEmailTemplate(orderData)
      };

      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      return response;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendStatusUpdateEmail(orderData: any): Promise<any> {
    try {
      const templateParams = {
        to_email: orderData.customerEmail,
        from_name: 'Tortillería Plata Jaimes',
        subject: `Actualización de Pedido #${orderData.orderId} - Tortillería Plata Jaimes`,
        html_content: this.generateStatusUpdateEmailTemplate(orderData)
      };

      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      return response;
    } catch (error) {
      console.error('Error sending status update email:', error);
      throw error;
    }
  }

  async sendPickupScheduleEmail(orderData: any): Promise<any> {
    try {
      const templateParams = {
        to_email: orderData.customerEmail,
        from_name: 'Tortillería Plata Jaimes',
        subject: `Horario de Recolección - Pedido #${orderData.orderId} - Tortillería Plata Jaimes`,
        html_content: this.generatePickupScheduleEmailTemplate(orderData)
      };

      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      return response;
    } catch (error) {
      console.error('Error sending pickup schedule email:', error);
      throw error;
    }
  }

  async sendThankYouEmail(orderData: any): Promise<any> {
    try {
      const templateParams = {
        to_email: orderData.customerEmail,
        from_name: 'Tortillería Plata Jaimes',
        subject: `¡Gracias por tu pedido! #${orderData.orderId} - Tortillería Plata Jaimes`,
        html_content: this.generateThankYouEmailTemplate(orderData)
      };

      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      return response;
    } catch (error) {
      console.error('Error sending thank you email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(welcomeData: any): Promise<any> {
    try {
      const templateParams = {
        to_email: welcomeData.customerEmail,
        from_name: 'Tortillería Plata Jaimes',
        subject: `¡Bienvenido a Tortillería Plata Jaimes! - ${welcomeData.customerName}`,
        html_content: this.generateWelcomeEmailTemplate(welcomeData)
      };

      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      return response;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  private generateCustomEmailTemplate(orderData: any): string {
    const itemsList = orderData.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left;">
          <div style="font-weight: 500; color: #333;">${item.producto?.nombre || 'Producto'}</div>
          <div style="font-size: 14px; color: #666;">${item.opcion?.nombre || ''}</div>
        </td>
        <td style="padding: 12px; text-align: center; color: #666;">x${item.cantidad}</td>
        <td style="padding: 12px; text-align: right; font-weight: 500; color: #333;">
          ${item.subtotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
        </td>
      </tr>
    `).join('');

    const currentDate = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmación de Pedido - Tortillería Plata Jaimes</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #2e7d32 0%, #388e3c 100%); padding: 30px 20px; text-align: center; color: white;">
                  <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 15px; border-radius: 50%; margin-bottom: 15px;">
                      <div style="font-size: 40px;">🫓</div>
                  </div>
                  <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Tortillería Plata Jaimes</h1>
                  <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Tradición y Sabor Auténtico</p>
              </div>

              <!-- Success Message -->
              <div style="background-color: #e8f5e8; border-left: 4px solid #2e7d32; padding: 20px; margin: 0;">
                  <div style="display: flex; align-items: center;">
                      <div style="background-color: #2e7d32; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px;">
                          ✓
                      </div>
                      <div>
                          <h2 style="margin: 0; color: #2e7d32; font-size: 24px;">¡Pedido Confirmado!</h2>
                          <p style="margin: 5px 0 0 0; color: #388e3c; font-size: 16px;">Hola ${orderData.customerName}, tu pedido ha sido procesado exitosamente.</p>
                      </div>
                  </div>
              </div>

              <!-- Order Details -->
              <div style="padding: 30px 20px;">
                  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px; border-bottom: 2px solid #2e7d32; padding-bottom: 8px;">Detalles del Pedido</h3>
                      <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                          <div style="flex: 1; min-width: 200px;">
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Número de Pedido</strong>
                                  <div style="color: #333; font-size: 18px; font-weight: 600; margin-top: 2px;">#${orderData.orderId}</div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Fecha y Hora</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">${currentDate}</div>
                              </div>
                          </div>
                          <div style="flex: 1; min-width: 200px;">
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Método de Pago</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">
                                      <span style="background-color: ${orderData.tipo_pago === 'Efectivo' ? '#ff9800' : '#2e7d32'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                          ${orderData.tipo_pago === 'Efectivo' ? '💵 ' + orderData.tipo_pago : '💳 ' + orderData.tipo_pago}
                                      </span>
                                  </div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Estado</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">
                                      <span style="background-color: #2e7d32; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                          ✓ ${orderData.estatus}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Products Table -->
                  <div style="margin-bottom: 25px;">
                      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Productos Ordenados</h3>
                      <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                          <table style="width: 100%; border-collapse: collapse;">
                              <thead>
                                  <tr style="background-color: #e8f5e8;">
                                      <th style="padding: 15px; text-align: left; color: #2e7d32; font-weight: 600; border-bottom: 1px solid #ddd;">Producto</th>
                                      <th style="padding: 15px; text-align: center; color: #2e7d32; font-weight: 600; border-bottom: 1px solid #ddd;">Cantidad</th>
                                      <th style="padding: 15px; text-align: right; color: #2e7d32; font-weight: 600; border-bottom: 1px solid #ddd;">Precio</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  ${itemsList}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  <!-- Pricing Summary -->
                  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">Resumen de Precios</h3>
                      <div style="space-y: 12px;">
                          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                              <span style="color: #666; font-size: 16px;">Subtotal (${orderData.items.length} productos) = </span>
                              <span style="color: #333; font-size: 16px; font-weight: 500;">${orderData.subtotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                          </div>
                          ${orderData.discountAmount > 0 ? `
                          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                              <span style="color: #666; font-size: 16px;">Descuento (${orderData.discountPercent}%) = </span>
                              <span style="color: #d32f2f; font-size: 16px; font-weight: 500;">-${orderData.discountAmount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                          </div>` : ''}
                          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                              <span style="color: #666; font-size: 16px;">Tarifa de transporte = </span>
                              <span style="color: #333; font-size: 16px; font-weight: 500;">${orderData.transportFee.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                          </div>
                          <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; background-color: #e8f5e8; margin: 15px -15px -15px -15px; padding-left: 15px; padding-right: 15px; border-radius: 8px;">
                              <span style="color: #2e7d32; font-size: 20px; font-weight: 600;">Total a Pagar = </span>
                              <span style="color: #2e7d32; font-size: 24px; font-weight: 700;">${orderData.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                          </div>
                      </div>
                  </div>

                  <!-- Delivery Info -->
                  <div style="background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%); border-left: 4px solid #2e7d32; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                      <h4 style="margin: 0 0 15px 0; color: #1b5e20; font-size: 18px; display: flex; align-items: center;">
                          <span style="margin-right: 8px;">🚚</span> Información de Entrega
                      </h4>
                      <div style="color: #2e7d32; line-height: 1.6;">
                          <p style="margin: 8px 0;"><strong>📍 Modalidad:</strong> Entrega a domicilio</p>
                          <p style="margin: 8px 0;"><strong>⏰ Tiempo estimado:</strong> 30-45 minutos</p>
                          <p style="margin: 8px 0;"><strong>📞 Contacto:</strong> Te contactaremos al momento de la entrega</p>
                          ${orderData.tipo_pago === 'Efectivo' ? '<p style="margin: 8px 0; font-weight: 600; color: #1b5e20;"><strong>💰 Importante:</strong> Pago en efectivo al recibir el pedido</p>' : '<p style="margin: 8px 0; color: #2e7d32;"><strong>✅ Pago procesado:</strong> Tu pago ha sido confirmado exitosamente</p>'}
                      </div>
                  </div>

                  <!-- Company Info -->
                  <div style="text-align: center; padding: 25px 0; border-top: 2px solid #f0f0f0;">
                      <div style="margin-bottom: 15px;">
                          <h4 style="margin: 0; color: #2e7d32; font-size: 18px;">Tortillería Plata Jaimes</h4>
                          <p style="margin: 5px 0; color: #666; font-size: 14px;">Tradición y Sabor Auténtico desde 1995</p>
                      </div>
                      <div style="color: #888; font-size: 14px; line-height: 1.5;">
                          <p style="margin: 4px 0;">📧 Email: info@mitortilleria.com</p>
                          <p style="margin: 4px 0;">📱 WhatsApp: +52 123 456 7890</p>
                          <p style="margin: 4px 0;">🌐 Síguenos en redes sociales: @MiTortilleria</p>
                      </div>
                      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                          <p style="margin: 0; color: #999; font-size: 12px;">
                              © ${new Date().getFullYear()} Tortillería Plata Jaimes. Todos los derechos reservados.<br>
                              Este correo fue enviado automáticamente, por favor no responder.
                          </p>
                      </div>
                  </div>

              </div>
          </div>
      </body>
      </html>
    `;
  }

  private generateStatusUpdateEmailTemplate(orderData: any): string {
    const itemsList = orderData.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left;">
          <div style="font-weight: 500; color: #333;">${item.producto?.nombre || 'Producto'}</div>
          <div style="font-size: 14px; color: #666;">${item.opcion?.nombre || ''}</div>
        </td>
        <td style="padding: 12px; text-align: center; color: #666;">x${item.cantidad}</td>
        <td style="padding: 12px; text-align: right; font-weight: 500; color: #333;">
          ${item.subtotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
        </td>
      </tr>
    `).join('');

    const currentDate = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Actualización de Pedido - Tortillería Plata Jaimes</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 30px 20px; text-align: center; color: white;">
                  <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 15px; border-radius: 50%; margin-bottom: 15px;">
                      <div style="font-size: 40px;">👨‍🍳</div>
                  </div>
                  <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Tortillería Plata Jaimes</h1>
                  <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Tradición y Sabor Auténtico</p>
              </div>

              <!-- Status Update Message -->
              <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 0;">
                  <div style="display: flex; align-items: center;">
                      <div style="background-color: #ff9800; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px;">
                          🔄
                      </div>
                      <div>
                          <h2 style="margin: 0; color: #e65100; font-size: 24px;">¡Tu pedido está en preparación!</h2>
                          <p style="margin: 5px 0 0 0; color: #ef6c00; font-size: 16px;">Hola ${orderData.customerName}, estamos preparando tu delicioso pedido.</p>
                      </div>
                  </div>
              </div>

              <!-- Order Details -->
              <div style="padding: 30px 20px;">
                  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px; border-bottom: 2px solid #ff9800; padding-bottom: 8px;">Detalles del Pedido</h3>
                      <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                          <div style="flex: 1; min-width: 200px;">
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Número de Pedido</strong>
                                  <div style="color: #333; font-size: 18px; font-weight: 600; margin-top: 2px;">#${orderData.orderId}</div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de Actualización</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">${currentDate}</div>
                              </div>
                          </div>
                          <div style="flex: 1; min-width: 200px;">
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Método de Pago</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">
                                      <span style="background-color: ${orderData.tipo_pago === 'Efectivo' ? '#ff9800' : '#2e7d32'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                          ${orderData.tipo_pago === 'Efectivo' ? '💵 ' + orderData.tipo_pago : '💳 ' + orderData.tipo_pago}
                                      </span>
                                  </div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Estado Actual</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">
                                      <span style="background-color: #ff9800; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                          👨‍🍳 ${orderData.estatus}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Products Table -->
                  <div style="margin-bottom: 25px;">
                      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Productos en Preparación</h3>
                      <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                          <table style="width: 100%; border-collapse: collapse;">
                              <thead>
                                  <tr style="background-color: #fff3e0;">
                                      <th style="padding: 15px; text-align: left; color: #e65100; font-weight: 600; border-bottom: 1px solid #ddd;">Producto</th>
                                      <th style="padding: 15px; text-align: center; color: #e65100; font-weight: 600; border-bottom: 1px solid #ddd;">Cantidad</th>
                                      <th style="padding: 15px; text-align: right; color: #e65100; font-weight: 600; border-bottom: 1px solid #ddd;">Precio</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  ${itemsList}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  <!-- Status Info -->
                  <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border-left: 4px solid #ff9800; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                      <h4 style="margin: 0 0 15px 0; color: #e65100; font-size: 18px; display: flex; align-items: center;">
                          <span style="margin-right: 8px;">👨‍🍳</span> Estado del Pedido
                      </h4>
                      <div style="color: #ef6c00; line-height: 1.6;">
                          <p style="margin: 8px 0;"><strong>🔄 Estado actual:</strong> En preparación</p>
                          <p style="margin: 8px 0;"><strong>⏰ Tiempo estimado:</strong> 15-25 minutos</p>
                          <p style="margin: 8px 0;"><strong>👨‍🍳 Nuestros chefs:</strong> Están preparando tu pedido con el mejor cuidado</p>
                          <p style="margin: 8px 0;"><strong>📞 Próximo paso:</strong> Te contactaremos cuando esté listo</p>
                      </div>
                  </div>

                  <!-- Total Summary -->
                  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; background-color: #fff3e0; margin: 0 -15px; padding-left: 15px; padding-right: 15px; border-radius: 8px;">
                          <span style="color: #e65100; font-size: 20px; font-weight: 600;">Total del Pedido = </span>
                          <span style="color: #e65100; font-size: 24px; font-weight: 700;">${orderData.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                      </div>
                  </div>

                  <!-- Company Info -->
                  <div style="text-align: center; padding: 25px 0; border-top: 2px solid #f0f0f0;">
                      <div style="margin-bottom: 15px;">
                          <h4 style="margin: 0; color: #ff9800; font-size: 18px;">Tortillería Plata Jaimes</h4>
                          <p style="margin: 5px 0; color: #666; font-size: 14px;">Tradición y Sabor Auténtico desde 1995</p>
                      </div>
                      <div style="color: #888; font-size: 14px; line-height: 1.5;">
                          <p style="margin: 4px 0;">📧 Email: info@mitortilleria.com</p>
                          <p style="margin: 4px 0;">📱 WhatsApp: +52 123 456 7890</p>
                          <p style="margin: 4px 0;">🌐 Síguenos en redes sociales: @MiTortilleria</p>
                      </div>
                      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                          <p style="margin: 0; color: #999; font-size: 12px;">
                              © ${new Date().getFullYear()} Tortillería Plata Jaimes. Todos los derechos reservados.<br>
                              Este correo fue enviado automáticamente, por favor no responder.
                          </p>
                      </div>
                  </div>

              </div>
          </div>
      </body>
      </html>
    `;
  }

  private generatePickupScheduleEmailTemplate(orderData: any): string {
    const itemsList = orderData.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left;">
          <div style="font-weight: 500; color: #333;">${item.producto?.nombre || 'Producto'}</div>
          <div style="font-size: 14px; color: #666;">${item.opcion?.nombre || ''}</div>
        </td>
        <td style="padding: 12px; text-align: center; color: #666;">x${item.cantidad}</td>
        <td style="padding: 12px; text-align: right; font-weight: 500; color: #333;">
          ${item.subtotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
        </td>
      </tr>
    `).join('');

    const currentDate = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const fechaRecoleccion = orderData.fechaRecoleccion.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Horario de Recolección - Tortillería Plata Jaimes</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #2e7d32 0%, #388e3c 100%); padding: 30px 20px; text-align: center; color: white;">
                  <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 15px; border-radius: 50%; margin-bottom: 15px;">
                      <div style="font-size: 40px;">⏰</div>
                  </div>
                  <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Tortillería Plata Jaimes</h1>
                  <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Tradición y Sabor Auténtico</p>
              </div>

              <!-- Pickup Schedule Message -->
              <div style="background-color: #e8f5e8; border-left: 4px solid #2e7d32; padding: 20px; margin: 0;">
                  <div style="display: flex; align-items: center;">
                      <div style="background-color: #2e7d32; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px;">
                          📅
                      </div>
                      <div>
                          <h2 style="margin: 0; color: #2e7d32; font-size: 24px;">¡Horario de Recolección Asignado!</h2>
                          <p style="margin: 5px 0 0 0; color: #388e3c; font-size: 16px;">Hola ${orderData.customerName}, tu pedido estará listo para recoger.</p>
                      </div>
                  </div>
              </div>

              <!-- Order Details -->
              <div style="padding: 30px 20px;">
                  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px; border-bottom: 2px solid #2e7d32; padding-bottom: 8px;">Detalles del Pedido</h3>
                      <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                          <div style="flex: 1; min-width: 200px;">
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Número de Pedido</strong>
                                  <div style="color: #333; font-size: 18px; font-weight: 600; margin-top: 2px;">#${orderData.orderId}</div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de Actualización</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">${currentDate}</div>
                              </div>
                          </div>
                          <div style="flex: 1; min-width: 200px;">
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Método de Pago</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">
                                      <span style="background-color: ${orderData.tipo_pago === 'Efectivo' ? '#ff9800' : '#2e7d32'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                          ${orderData.tipo_pago === 'Efectivo' ? '💵 ' + orderData.tipo_pago : '💳 ' + orderData.tipo_pago}
                                      </span>
                                  </div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Estado Actual</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">
                                      <span style="background-color: #2e7d32; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                          ⏰ ${orderData.estatus}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Pickup Info -->
                  <div style="background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%); border-left: 4px solid #2e7d32; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                      <h4 style="margin: 0 0 15px 0; color: #1b5e20; font-size: 18px; display: flex; align-items: center;">
                          <span style="margin-right: 8px;">📅</span> Información de Recolección
                      </h4>
                      <div style="color: #2e7d32; line-height: 1.6;">
                          <p style="margin: 8px 0; font-size: 18px; font-weight: 600;"><strong>🕐 Fecha y hora de recolección:</strong></p>
                          <p style="margin: 8px 0; font-size: 20px; font-weight: 700; color: #1b5e20; background-color: rgba(46, 125, 50, 0.1); padding: 10px; border-radius: 8px; text-align: center;">${fechaRecoleccion}</p>
                          <p style="margin: 8px 0;"><strong>📍 Dirección:</strong> Tortillería Plata Jaimes - Calle Principal #123</p>
                          <p style="margin: 8px 0;"><strong>📞 Contacto:</strong> +52 123 456 7890</p>
                          <p style="margin: 8px 0;"><strong>⚠️ Importante:</strong> Por favor llega puntual a la hora asignada</p>
                      </div>
                  </div>

                  <!-- Products Table -->
                  <div style="margin-bottom: 25px;">
                      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Productos a Recoger</h3>
                      <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                          <table style="width: 100%; border-collapse: collapse;">
                              <thead>
                                  <tr style="background-color: #e8f5e8;">
                                      <th style="padding: 15px; text-align: left; color: #2e7d32; font-weight: 600; border-bottom: 1px solid #ddd;">Producto</th>
                                      <th style="padding: 15px; text-align: center; color: #2e7d32; font-weight: 600; border-bottom: 1px solid #ddd;">Cantidad</th>
                                      <th style="padding: 15px; text-align: right; color: #2e7d32; font-weight: 600; border-bottom: 1px solid #ddd;">Precio</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  ${itemsList}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  <!-- Total Summary -->
                  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; background-color: #e8f5e8; margin: 0 -15px; padding-left: 15px; padding-right: 15px; border-radius: 8px;">
                          <span style="color: #2e7d32; font-size: 20px; font-weight: 600;">Total del Pedido = </span>
                          <span style="color: #2e7d32; font-size: 24px; font-weight: 700;">${orderData.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                      </div>
                  </div>

                  <!-- Company Info -->
                  <div style="text-align: center; padding: 25px 0; border-top: 2px solid #f0f0f0;">
                      <div style="margin-bottom: 15px;">
                          <h4 style="margin: 0; color: #2e7d32; font-size: 18px;">Tortillería Plata Jaimes</h4>
                          <p style="margin: 5px 0; color: #666; font-size: 14px;">Tradición y Sabor Auténtico desde 1995</p>
                      </div>
                      <div style="color: #888; font-size: 14px; line-height: 1.5;">
                          <p style="margin: 4px 0;">📧 Email: info@mitortilleria.com</p>
                          <p style="margin: 4px 0;">📱 WhatsApp: +52 123 456 7890</p>
                          <p style="margin: 4px 0;">🌐 Síguenos en redes sociales: @MiTortilleria</p>
                      </div>
                      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                          <p style="margin: 0; color: #999; font-size: 12px;">
                              © ${new Date().getFullYear()} Tortillería Plata Jaimes. Todos los derechos reservados.<br>
                              Este correo fue enviado automáticamente, por favor no responder.
                          </p>
                      </div>
                  </div>

              </div>
          </div>
      </body>
      </html>
    `;
  }

  private generateThankYouEmailTemplate(orderData: any): string {
    const itemsList = orderData.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: left;">
          <div style="font-weight: 500; color: #333;">${item.producto?.nombre || 'Producto'}</div>
          <div style="font-size: 14px; color: #666;">${item.opcion?.nombre || ''}</div>
        </td>
        <td style="padding: 12px; text-align: center; color: #666;">x${item.cantidad}</td>
        <td style="padding: 12px; text-align: right; font-weight: 500; color: #333;">
          ${item.subtotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
        </td>
      </tr>
    `).join('');

    const currentDate = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>¡Gracias por tu Pedido! - Tortillería Plata Jaimes</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #2e7d32 0%, #388e3c 100%); padding: 30px 20px; text-align: center; color: white;">
                  <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 15px; border-radius: 50%; margin-bottom: 15px;">
                      <div style="font-size: 40px;">🎉</div>
                  </div>
                  <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Tortillería Plata Jaimes</h1>
                  <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Tradición y Sabor Auténtico</p>
              </div>

              <!-- Thank You Message -->
              <div style="background-color: #e8f5e8; border-left: 4px solid #2e7d32; padding: 20px; margin: 0;">
                  <div style="display: flex; align-items: center;">
                      <div style="background-color: #2e7d32; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px;">
                          ❤️
                      </div>
                      <div>
                          <h2 style="margin: 0; color: #2e7d32; font-size: 24px;">¡Gracias por elegirnos!</h2>
                          <p style="margin: 5px 0 0 0; color: #388e3c; font-size: 16px;">Hola ${orderData.customerName}, tu pedido ha sido entregado exitosamente.</p>
                      </div>
                  </div>
              </div>

              <!-- Order Summary -->
              <div style="padding: 30px 20px;">
                  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px; border-bottom: 2px solid #2e7d32; padding-bottom: 8px;">Resumen de tu Pedido</h3>
                      <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                          <div style="flex: 1; min-width: 200px;">
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Número de Pedido</strong>
                                  <div style="color: #333; font-size: 18px; font-weight: 600; margin-top: 2px;">#${orderData.orderId}</div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de Entrega</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">${currentDate}</div>
                              </div>
                          </div>
                          <div style="flex: 1; min-width: 200px;">
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Método de Pago</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">
                                      <span style="background-color: ${orderData.tipo_pago === 'Efectivo' ? '#ff9800' : '#2e7d32'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                          ${orderData.tipo_pago === 'Efectivo' ? '💵 ' + orderData.tipo_pago : '💳 ' + orderData.tipo_pago}
                                      </div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <strong style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Estado</strong>
                                  <div style="color: #333; font-size: 16px; margin-top: 2px;">
                                      <span style="background-color: #2e7d32; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                          ✅ ${orderData.estatus}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Products Table -->
                  <div style="margin-bottom: 25px;">
                      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">Productos Entregados</h3>
                      <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                          <table style="width: 100%; border-collapse: collapse;">
                              <thead>
                                  <tr style="background-color: #e8f5e8;">
                                      <th style="padding: 15px; text-align: left; color: #2e7d32; font-weight: 600; border-bottom: 1px solid #ddd;">Producto</th>
                                      <th style="padding: 15px; text-align: center; color: #2e7d32; font-weight: 600; border-bottom: 1px solid #ddd;">Cantidad</th>
                                      <th style="padding: 15px; text-align: right; color: #2e7d32; font-weight: 600; border-bottom: 1px solid #ddd;">Precio</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  ${itemsList}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  <!-- Rating Request -->
                  <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border-left: 4px solid #ff9800; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                      <h4 style="margin: 0 0 15px 0; color: #e65100; font-size: 18px; display: flex; align-items: center;">
                          <span style="margin-right: 8px;">⭐</span> ¡Tu opinión nos importa!
                      </h4>
                      <div style="color: #ef6c00; line-height: 1.6;">
                          <p style="margin: 8px 0;"><strong>🌟 Califica tu experiencia:</strong> Esperamos que hayas disfrutado nuestros productos</p>
                          <p style="margin: 8px 0;"><strong>📱 Próximamente:</strong> Podrás calificar tu pedido desde tu historial en la app</p>
                          <p style="margin: 8px 0;"><strong>💬 Compártenos:</strong> Tu feedback nos ayuda a mejorar cada día</p>
                          <p style="margin: 8px 0;"><strong>🙏 ¡Gracias por confiar en nosotros!</strong></p>
                      </div>
                  </div>

                  <!-- Total Summary -->
                  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; background-color: #e8f5e8; margin: 0 -15px; padding-left: 15px; padding-right: 15px; border-radius: 8px;">
                          <span style="color: #2e7d32; font-size: 20px; font-weight: 600;">Total Pagado = </span>
                          <span style="color: #2e7d32; font-size: 24px; font-weight: 700;">${orderData.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                      </div>
                  </div>

                  <!-- Promotion Section -->
                  <div style="background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%); border-left: 4px solid #2e7d32; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                      <h4 style="margin: 0 0 15px 0; color: #1b5e20; font-size: 18px; display: flex; align-items: center;">
                          <span style="margin-right: 8px;">🎁</span> ¡Vuelve pronto!
                      </h4>
                      <div style="color: #2e7d32; line-height: 1.6;">
                          <p style="margin: 8px 0;"><strong>🆕 Nuevos productos:</strong> Descubre nuestras novedades cada semana</p>
                          <p style="margin: 8px 0;"><strong>🏷️ Promociones especiales:</strong> Mantente atento a nuestros descuentos</p>
                          <p style="margin: 8px 0;"><strong>📲 Síguenos:</strong> En redes sociales para no perderte ninguna oferta</p>
                          <p style="margin: 8px 0;"><strong>❤️ ¡Te esperamos de vuelta!</strong></p>
                      </div>
                  </div>

                  <!-- Company Info -->
                  <div style="text-align: center; padding: 25px 0; border-top: 2px solid #f0f0f0;">
                      <div style="margin-bottom: 15px;">
                          <h4 style="margin: 0; color: #2e7d32; font-size: 18px;">Tortillería Plata Jaimes</h4>
                          <p style="margin: 5px 0; color: #666; font-size: 14px;">Tradición y Sabor Auténtico desde 1995</p>
                      </div>
                      <div style="color: #888; font-size: 14px; line-height: 1.5;">
                          <p style="margin: 4px 0;">📧 Email: info@mitortilleria.com</p>
                          <p style="margin: 4px 0;">📱 WhatsApp: +52 123 456 7890</p>
                          <p style="margin: 4px 0;">🌐 Síguenos en redes sociales: @MiTortilleria</p>
                      </div>
                      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                          <p style="margin: 0; color: #999; font-size: 12px;">
                              © ${new Date().getFullYear()} Tortillería Plata Jaimes. Todos los derechos reservados.<br>
                              ¡Gracias por ser parte de nuestra familia tortillera!
                          </p>
                      </div>
                  </div>

              </div>
          </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailTemplate(welcomeData: any): string {
    const currentDate = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>¡Bienvenido a Tortillería Plata Jaimes!</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #2e7d32 0%, #388e3c 100%); padding: 40px 20px; text-align: center; color: white;">
                  <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 20px; border-radius: 50%; margin-bottom: 20px;">
                      <div style="font-size: 50px;">🎉</div>
                  </div>
                  <h1 style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -0.5px;">¡Bienvenido!</h1>
                  <p style="margin: 8px 0 0 0; font-size: 18px; opacity: 0.9;">Tortillería Plata Jaimes - Tradición y Sabor Auténtico</p>
              </div>

              <!-- Welcome Message -->
              <div style="background-color: #e8f5e8; border-left: 4px solid #2e7d32; padding: 25px; margin: 0;">
                  <div style="display: flex; align-items: center;">
                      <div style="background-color: #2e7d32; color: white; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; margin-right: 20px; font-size: 24px;">
                          👋
                      </div>
                      <div>
                          <h2 style="margin: 0; color: #2e7d32; font-size: 28px;">¡Hola ${welcomeData.customerName}!</h2>
                          <p style="margin: 5px 0 0 0; color: #388e3c; font-size: 18px;">Te has registrado exitosamente en Tortillería Plata Jaimes</p>
                      </div>
                  </div>
              </div>

              <!-- Registration Details -->
              <div style="padding: 40px 30px;">
                  <div style="background-color: #f8f9fa; border-radius: 15px; padding: 30px; margin-bottom: 30px;">
                      <h3 style="margin: 0 0 25px 0; color: #333; font-size: 24px; border-bottom: 2px solid #2e7d32; padding-bottom: 10px;">Detalles de tu Registro</h3>
                      <div style="space-y: 15px;">
                          <div style="margin-bottom: 20px;">
                              <strong style="color: #666; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Nombre Registrado:</strong>
                              <div style="color: #333; font-size: 20px; font-weight: 600; margin-top: 5px;">${welcomeData.customerName}</div>
                          </div>
                          <div style="margin-bottom: 20px;">
                              <strong style="color: #666; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Correo Electrónico:</strong>
                              <div style="color: #333; font-size: 18px; margin-top: 5px;">${welcomeData.customerEmail}</div>
                          </div>
                          <div style="margin-bottom: 20px;">
                              <strong style="color: #666; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de Registro:</strong>
                              <div style="color: #333; font-size: 18px; margin-top: 5px;">${currentDate}</div>
                          </div>
                          <div style="margin-bottom: 20px;">
                              <strong style="color: #666; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Tipo de Cuenta:</strong>
                              <div style="color: #333; font-size: 18px; margin-top: 5px;">
                                  <span style="background-color: ${welcomeData.isBusiness ? '#ff9800' : '#2e7d32'}; color: white; padding: 6px 15px; border-radius: 25px; font-size: 16px;">
                                      ${welcomeData.isBusiness ? '🏪 Negocio/Taquería' : '👤 Cliente Personal'}
                                  </span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Welcome Benefits -->
                  <div style="background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%); border-left: 4px solid #2e7d32; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                      <h4 style="margin: 0 0 20px 0; color: #1b5e20; font-size: 22px; display: flex; align-items: center;">
                          <span style="margin-right: 10px;">🎁</span> ¡Disfruta de estos beneficios!
                      </h4>
                      <div style="color: #2e7d32; line-height: 1.8;">
                          <p style="margin: 12px 0; font-size: 16px;"><strong>🫓 Productos Frescos:</strong> Tortillas recién hechas todos los días</p>
                          <p style="margin: 12px 0; font-size: 16px;"><strong>🚚 Entregas a Domicilio:</strong> Llevamos tu pedido hasta tu puerta</p>
                          <p style="margin: 12px 0; font-size: 16px;"><strong>💰 Precios Especiales:</strong> Descuentos exclusivos para clientes registrados</p>
                          <p style="margin: 12px 0; font-size: 16px;"><strong>📱 Fácil Pedido:</strong> Ordena desde tu móvil cuando quieras</p>
                          ${welcomeData.isBusiness ? '<p style="margin: 12px 0; font-size: 16px;"><strong>🏪 Beneficios Empresariales:</strong> Descuentos especiales por volumen</p>' : ''}
                      </div>
                  </div>

                  <!-- Getting Started -->
                  <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border-left: 4px solid #ff9800; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                      <h4 style="margin: 0 0 20px 0; color: #e65100; font-size: 22px; display: flex; align-items: center;">
                          <span style="margin-right: 10px;">🚀</span> ¿Cómo empezar?
                      </h4>
                      <div style="color: #ef6c00; line-height: 1.8;">
                          <p style="margin: 12px 0; font-size: 16px;"><strong>1. 📱 Explora nuestro catálogo:</strong> Descubre todos nuestros productos</p>
                          <p style="margin: 12px 0; font-size: 16px;"><strong>2. 🛒 Agrega al carrito:</strong> Selecciona tus productos favoritos</p>
                          <p style="margin: 12px 0; font-size: 16px;"><strong>3. 📍 Confirma tu dirección:</strong> Para entregas precisas</p>
                          <p style="margin: 12px 0; font-size: 16px;"><strong>4. 💳 Realiza tu pedido:</strong> Pago en efectivo o tarjeta</p>
                          <p style="margin: 12px 0; font-size: 16px;"><strong>5. 🎉 ¡Disfruta!</strong> Recibe tus tortillas frescas</p>
                      </div>
                  </div>

                  <!-- Contact Info -->
                  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                      <h4 style="margin: 0 0 20px 0; color: #333; font-size: 22px;">¿Necesitas ayuda?</h4>
                      <div style="color: #666; line-height: 1.6; font-size: 16px;">
                          <p style="margin: 10px 0;"><strong>📞 Teléfono:</strong> +52 123 456 7890</p>
                          <p style="margin: 10px 0;"><strong>📧 Email:</strong> info@mitortilleria.com</p>
                          <p style="margin: 10px 0;"><strong>💬 WhatsApp:</strong> +52 123 456 7890</p>
                          <p style="margin: 10px 0;"><strong>🌐 Redes Sociales:</strong> @MiTortilleria</p>
                          <p style="margin: 10px 0;"><strong>⏰ Horarios:</strong> Lunes a Domingo, 7:00 AM - 9:00 PM</p>
                      </div>
                  </div>

                  <!-- Company Info -->
                  <div style="text-align: center; padding: 30px 0; border-top: 2px solid #f0f0f0;">
                      <div style="margin-bottom: 20px;">
                          <h4 style="margin: 0; color: #2e7d32; font-size: 24px;">Tortillería Plata Jaimes</h4>
                          <p style="margin: 8px 0; color: #666; font-size: 16px;">Tradición y Sabor Auténtico desde 1995</p>
                          <p style="margin: 8px 0; color: #888; font-size: 14px;">Más de 25 años llevando el mejor sabor a tu mesa</p>
                      </div>
                      
                      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
                          <p style="margin: 0; color: #999; font-size: 14px;">
                              © ${new Date().getFullYear()} Tortillería Plata Jaimes. Todos los derechos reservados.<br>
                              ¡Gracias por unirte a nuestra familia tortillera!
                          </p>
                      </div>
                  </div>

              </div>
          </div>
      </body>
      </html>
    `;
  }

  private generateItemsList(items: any[]): string {
    return items.map(item => 
      `${item.producto?.nombre || 'Producto'} x${item.cantidad} - ${item.subtotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`
    ).join('\n');
  }
}

