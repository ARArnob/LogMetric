package org.example.logmetricapi.config;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {
   @Bean
    public Queue logQueue(){
       return new Queue("log.queue", true);
   }
   @Bean
    public MessageConverter JsonMessageConverter(){
       return new JacksonJsonMessageConverter();
   }
}
