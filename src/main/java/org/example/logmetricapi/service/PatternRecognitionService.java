package org.example.logmetricapi.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PatternRecognitionService {

    public record ParsedMessage(String template, List<String> parameters) {}

    private static final Pattern MASKING_PATTERN = Pattern.compile(
            "(?<uuid>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})" +
            "|(?<email>[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,})" +
            "|(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)" +
            "|(?<hex>\\b[0-9a-f]{16,}\\b)" +
            "|(?<str>\"[^\"]*\")" +
            "|(?<num>[-+]?\\b\\d+\\.\\d+\\b|[-+]?\\b\\d+\\b)",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Parses the message by applying ordered masking rules.
     * The `parameters` list holds the masked-out values in order of appearance.
     * Index `i` in the list corresponds to the `i`-th token in the template.
     */
    public ParsedMessage parse(String message) {
        if (message == null) {
            return new ParsedMessage(null, List.of());
        }
        Matcher matcher = MASKING_PATTERN.matcher(message);
        StringBuilder template = new StringBuilder();
        List<String> parameters = new ArrayList<>();
        
        while (matcher.find()) {
            String replacement;
            if (matcher.group("uuid") != null) {
                replacement = "{UUID}";
            } else if (matcher.group("email") != null) {
                replacement = "{EMAIL}";
            } else if (matcher.group("ip") != null) {
                replacement = "{IP}";
            } else if (matcher.group("hex") != null) {
                replacement = "{HEX}";
            } else if (matcher.group("str") != null) {
                replacement = "{STR}";
            } else if (matcher.group("num") != null) {
                replacement = "{NUM}";
            } else {
                continue; // Should not happen
            }
            
            matcher.appendReplacement(template, replacement);
            parameters.add(matcher.group());
        }
        matcher.appendTail(template);
        
        return new ParsedMessage(template.toString(), parameters);
    }

    public String cleanser(String message){
        if (message == null) return null;
        return parse(message).template();
    }

    public String generateHash(String cleansedTemplate) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(cleansedTemplate.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        }
        catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}