package com.ironman.repository;

import com.ironman.model.User;
import com.ironman.model.UserRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCase(String email);

  List<User> findByRole(UserRole role);

  List<User> findByRoleIn(List<UserRole> roles);

  /**
   * Customer-list page with a free-text filter over name / email / phone.
   * Role is passed as a parameter (matches findByRole / findByRoleIn pattern)
   * because inlining the JPQL enum literal binds the param as varchar and
   * never matches the Postgres user_role enum column.
   */
  @Query(
      "select u from User u "
          + "where u.role = :role "
          + "  and (:q is null or :q = '' "
          + "       or lower(u.fullName) like lower(concat('%', :q, '%')) "
          + "       or lower(u.email) like lower(concat('%', :q, '%')) "
          + "       or lower(u.phone) like lower(concat('%', :q, '%'))) "
          + "order by u.createdAt desc")
  Page<User> searchCustomers(
      @Param("q") String query,
      @Param("role") UserRole role,
      Pageable pageable);
}
