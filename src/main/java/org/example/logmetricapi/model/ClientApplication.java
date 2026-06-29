package org.example.logmetricapi.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "client_applications")
public class ClientApplication {
    @Id
    @GeneratedValue
    private long id;

    private String name;
    private String apiKey;

    public ClientApplication(String name, String apiKey) {
        this.name = name;
        this.apiKey = apiKey;
    }
    public ClientApplication() {}

    public long getId() {
        return id;
    }
    public void setId(long id) {this.id = id;}
    public String getName() {return name;}
    public void setName(String name) {this.name = name;}
    public String getApiKey() {return apiKey;}
    public void setApiKey(String apiKey) {this.apiKey = apiKey;}
}
