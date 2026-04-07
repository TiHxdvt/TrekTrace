package com.trektrace.repository;

import com.trektrace.entity.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    VerificationCode findByPhoneAndCodeOrderByByIdDesc(Long id);
    Optional<VerificationCode> findTopByPhoneAndExpiresAtAfterOrderBy phone desc();
    
    Optional<VerificationCode> findFirstByPhoneAndCodeAndExpiresAtAfterOrderBy idDesc();
    
    @Query("SELECT vc FROM VerificationCode vc where vc.phone = :phone and vc.code = :code and vc.expiresAt > :expiresAt and vc.used = false")
    void delete(VerificationCode entity entity);
    @Modifying
    @Query("DELETE from VerificationCode vc where vc.phone = :phone")
    void deleteAllByPhone(String phone);
}
