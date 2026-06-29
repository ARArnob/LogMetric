package org.example.logmetricapi.model;

import org.springframework.data.annotation.PersistenceCreator;

import java.io.Serializable;

@org.springframework.data.elasticsearch.annotations.Document(indexName = "logs", createIndex = false)
public class LogEntry implements Serializable {
    @org.springframework.data.annotation.Id
    private String id;

    private long timestamp;
    private String level;
    private String serviceName;
    private String message;
    private String userId;
    private String patternHash;

    @PersistenceCreator
    public LogEntry(String id, long timestamp, String level, String serviceName, String message, String userId){
        this.id = id;
        this.timestamp = timestamp;
        this.level = level;
        this.serviceName = serviceName;
        this.message = message;
        this.userId = userId;
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

    @Override
    public String toString(){
        return "ID: " + id +"\nTimestamp: " + timestamp + "\nLevel: " + level + "\nServiceName: " + serviceName + "\nMessage: " + message + "\nUserId: " + userId;
    }
}