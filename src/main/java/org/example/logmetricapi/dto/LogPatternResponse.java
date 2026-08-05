package org.example.logmetricapi.dto;

import java.sql.Timestamp;

public class LogPatternResponse {
    private String patternHash;
    private String template;
    private String sampleMessage;
    private Timestamp firstSeen;
    private Timestamp lastSeen;
    private long occurrenceCount;

    public LogPatternResponse(String patternHash, String template, String sampleMessage, Timestamp firstSeen, Timestamp lastSeen, long occurrenceCount) {
        this.patternHash = patternHash;
        this.template = template;
        this.sampleMessage = sampleMessage;
        this.firstSeen = firstSeen;
        this.lastSeen = lastSeen;
        this.occurrenceCount = occurrenceCount;
    }

    public String getPatternHash() { return patternHash; }
    public void setPatternHash(String patternHash) { this.patternHash = patternHash; }

    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }

    public String getSampleMessage() { return sampleMessage; }
    public void setSampleMessage(String sampleMessage) { this.sampleMessage = sampleMessage; }

    public Timestamp getFirstSeen() { return firstSeen; }
    public void setFirstSeen(Timestamp firstSeen) { this.firstSeen = firstSeen; }

    public Timestamp getLastSeen() { return lastSeen; }
    public void setLastSeen(Timestamp lastSeen) { this.lastSeen = lastSeen; }

    public long getOccurrenceCount() { return occurrenceCount; }
    public void setOccurrenceCount(long occurrenceCount) { this.occurrenceCount = occurrenceCount; }
}
