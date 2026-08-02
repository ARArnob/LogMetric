package org.example.logmetricapi.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Captures outbound mail in-memory instead of talking to real SMTP/MailHog,
 * so integration tests exercising the T37 OTP flow can read back the code
 * that was "emailed" without depending on infra beyond Postgres/ES (which
 * every other integration test in this project already requires).
 */
@TestConfiguration
public class FakeMailConfig {

    private static final Map<String, String> lastMessageByRecipient = new ConcurrentHashMap<>();
    private static final Pattern CODE_PATTERN = Pattern.compile("\\d{6}");

    @Bean
    @Primary
    public JavaMailSender testJavaMailSender() {
        return new JavaMailSenderImpl() {
            @Override
            public void send(SimpleMailMessage simpleMessage) {
                String[] to = simpleMessage.getTo();
                if (to != null && to.length > 0) {
                    lastMessageByRecipient.put(to[0], simpleMessage.getText());
                }
            }
        };
    }

    /** The 6-digit code from the most recent mail "sent" to this address, or null if none was sent. */
    public static String lastCodeSentTo(String email) {
        String text = lastMessageByRecipient.get(email);
        if (text == null) return null;
        Matcher matcher = CODE_PATTERN.matcher(text);
        return matcher.find() ? matcher.group() : null;
    }
}
