package org.example.logmetricapi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

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

    private void send(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }
}
