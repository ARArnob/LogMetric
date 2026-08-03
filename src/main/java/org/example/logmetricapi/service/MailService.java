package org.example.logmetricapi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class MailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public MailService(JavaMailSender mailSender, @Value("${mail.from}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    public void sendVerificationCode(String to, String code) {
        send(to, "Verify your LogMetric email",
                "Your LogMetric verification code is: " + code + "\n\n" +
                        "This code expires in 10 minutes. If you didn't request this, you can ignore this email.");
    }

    public void sendPasswordResetCode(String to, String code) {
        send(to, "Reset your LogMetric password",
                "Your LogMetric password reset code is: " + code + "\n\n" +
                        "This code expires in 10 minutes. If you didn't request this, you can ignore this email.");
    }

    /**
     * One send() call with every recipient in the To header, not one email
     * per recipient -- a sustained incident already has a cooldown limiting
     * how often this fires (AlertDeliveryService); fanning it out further
     * per-recipient would multiply that by list size for no benefit.
     */
    public void sendAlertNotification(Set<String> recipients, String ruleName, String detail) {
        if (recipients == null || recipients.isEmpty()) {
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(recipients.toArray(new String[0]));
        message.setSubject("LogMetric alert: " + ruleName);
        message.setText(detail);
        
        try {
            mailSender.send(message);
        } catch (org.springframework.mail.MailException e) {
            System.err.println("\n=== FAILED TO SEND EMAIL (SMTP BLOCKED?) ===");
            System.err.println("To: " + String.join(", ", recipients));
            System.err.println("Subject: LogMetric alert: " + ruleName);
            System.err.println("Detail: " + detail);
            System.err.println("============================================\n");
        }
    }

    private void send(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        
        try {
            mailSender.send(message);
        } catch (org.springframework.mail.MailException e) {
            System.err.println("\n=== FAILED TO SEND EMAIL (SMTP BLOCKED?) ===");
            System.err.println("To: " + to);
            System.err.println("Subject: " + subject);
            System.err.println("Body: \n" + text);
            System.err.println("============================================\n");
        }
    }
}
