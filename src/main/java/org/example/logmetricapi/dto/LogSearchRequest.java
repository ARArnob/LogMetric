package org.example.logmetricapi.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.List;

public class LogSearchRequest {
    private String keyword;
    private List<String> levels;
    private List<String> serviceNames;
    private Long startDate;
    private Long endDate;

    @Min(value = 0, message = "page must be 0 or greater")
    private int page = 0;

    // Upper-bounded well under Elasticsearch's default index.max_result_window (10000)
    // so an oversized request 400s instead of erroring out of the ES call.
    @Min(value = 1, message = "size must be at least 1")
    @Max(value = 1000, message = "size must not exceed 1000")
    private int size = 50;

    private String systemId;
    private String patternHash;

    public String getSystemId() {
        return systemId;
    }

    public void setSystemId(String systemId) {
        this.systemId = systemId;
    }

    public String getPatternHash() {
        return patternHash;
    }

    public void setPatternHash(String patternHash) {
        this.patternHash = patternHash;
    }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    
    public List<String> getLevels() { return levels; }
    public void setLevels(List<String> levels) { this.levels = levels; }
    
    public List<String> getServiceNames() { return serviceNames; }
    public void setServiceNames(List<String> serviceNames) { this.serviceNames = serviceNames; }
    
    public Long getStartDate() { return startDate; }
    public void setStartDate(Long startDate) { this.startDate = startDate; }
    
    public Long getEndDate() { return endDate; }
    public void setEndDate(Long endDate) { this.endDate = endDate; }
    
    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
    
    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }
}
