package org.example.logmetricapi.model;

import org.springframework.data.annotation.PersistenceCreator;

import java.io.Serializable;

import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@org.springframework.data.elasticsearch.annotations.Document(indexName = "logs", createIndex = false)
public class LogEntry implements Serializable {
    @org.springframework.data.annotation.Id
    private String id;

    @Field(type = FieldType.Date)
    private long timestamp;
    @Field(type = FieldType.Keyword)
    private String level;
    @Field(type = FieldType.Keyword)
    private String serviceName;
    @Field(type = FieldType.Text)
    private String message;
    @Field(type = FieldType.Keyword)
    private String userId;
    @Field(type = FieldType.Keyword)
    private String patternHash;
    @Field(type = FieldType.Keyword)
    private String organizationId;

    @PersistenceCreator
    public LogEntry(String id, long timestamp, String level, String serviceName, String message, String userId, String organizationId){
        this.id = id;
        this.timestamp = timestamp;
        this.level = level;
        this.serviceName = serviceName;
        this.message = message;
        this.userId = userId;
        this.organizationId = organizationId;
    }
    public String getId() {
        return id;
    }
    public void setId(String id){
        this.id = id;
    }
    public long getTimestamp() {
        return timestamp;
    }
    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
    public String getLevel(){
        return level;
    }
    public void setLevel(String level){
        this.level = level;
    }
    public String getServiceName(){
        return serviceName;
    }
    public void setServiceName(String serviceName){
        this.serviceName = serviceName;
    }
    public String getMessage(){
        return message;
    }
    public void setMessage(String message){
        this.message = message;
    }
    public String getUserId(){
        return userId;
    }
    public void setUserId(String userId){
        this.userId = userId;
    }
    public String getPatternHash(){
        return patternHash;
    }
    public void setPatternHash(String patternHash){
        this.patternHash = patternHash;
    }
    public String getOrganizationId() {
        return organizationId;
    }
    public void setOrganizationId(String organizationId) {
        this.organizationId = organizationId;
    }

    @Override
    public String toString(){
        return "ID: " + id +"\nTimestamp: " + timestamp + "\nLevel: " + level + "\nServiceName: " + serviceName + "\nMessage: " + message + "\nUserId: " + userId + "\nOrganizationId: " + organizationId;
    }
}