package org.example.logmetricapi.dto;

import java.util.List;

public class LogSearchRequest {
    private String keyword;
    private List<String> levels;
    private List<String> serviceNames;
    private Long startDate;
    private Long endDate;
    private int page = 0;
    private int size = 50;

    private String systemId;

    public String getSystemId() {
        return systemId;
    }

    public void setSystemId(String systemId) {
        this.systemId = systemId;
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
