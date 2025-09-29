# Missing API Features - Education Portal

**Document Version:** 1.0
**Last Updated:** December 2024
**Status:** Ready for Implementation

## 📋 **Overview**

This document lists all missing API models, controllers, and features that need to be implemented to complete the Education Portal system as per the requirements.

---

## 🚨 **CRITICAL MISSING FEATURES (High Priority)**

### 1. **Review & Rating System (COMPLETELY MISSING)**

#### **Missing Models:**
```php
// app/Models/Review.php
- id, quiz_id, course_id, user_id, rating (1-5), comment, helpful_count, is_moderated, created_at, updated_at

// app/Models/ReviewResponse.php
- id, review_id, author_id, response, created_at, updated_at

// app/Models/ReviewHelpfulness.php
- id, review_id, user_id, is_helpful, created_at, updated_at
```

#### **Missing Controllers:**
```php
// app/Http/Controllers/Api/ReviewController.php
- index(), store(), show(), update(), destroy()
- markHelpful(), unmarkHelpful()
- moderate(), approve(), reject()

// app/Http/Controllers/Api/ReviewResponseController.php
- store(), update(), destroy()
```

#### **Missing Migrations:**
```sql
- create_reviews_table
- create_review_responses_table
- create_review_helpfulness_table
```

#### **Missing API Routes:**
```php
Route::apiResource('reviews', ReviewController::class);
Route::post('reviews/{review}/helpful', [ReviewController::class, 'markHelpful']);
Route::post('reviews/{review}/moderate', [ReviewController::class, 'moderate']);
Route::apiResource('reviews.responses', ReviewResponseController::class);
```

---

### 2. **Course System (PLANNED BUT NOT IMPLEMENTED)**

#### **Missing Models:**
```php
// app/Models/Course.php
- id, title, slug, cover, summary, price, is_paid, difficulty, category_id, author_id, status, rejection_note, enrollments, rating, review_count, created_at, updated_at

// app/Models/CourseChapter.php
- id, course_id, title, description, order, created_at, updated_at

// app/Models/CourseLesson.php
- id, chapter_id, title, type, content, order, duration, created_at, updated_at

// app/Models/CourseEnrollment.php (Basic exists, needs enhancement)
- id, course_id, user_id, enrolled_at, completed_at, progress, status

// app/Models/CourseProgress.php
- id, enrollment_id, lesson_id, completed_at, score, attempts

// app/Models/CoursePrerequisite.php
- id, course_id, prerequisite_course_id, is_required, created_at

// app/Models/CourseLearningObjective.php
- id, course_id, objective, order, created_at, updated_at

// app/Models/CourseCertificate.php
- id, enrollment_id, certificate_url, issued_at, created_at

// app/Models/CourseOfflineContent.php
- id, course_id, lesson_id, content_url, file_size, downloaded_at, created_at
```

#### **Missing Controllers:**
```php
// app/Http/Controllers/Api/CourseController.php
// app/Http/Controllers/Api/CourseChapterController.php
// app/Http/Controllers/Api/CourseLessonController.php
// app/Http/Controllers/Api/CourseEnrollmentController.php
// app/Http/Controllers/Api/CourseProgressController.php
```

#### **Missing Migrations:**
```sql
- create_courses_table
- create_course_chapters_table
- create_course_lessons_table
- create_course_enrollments_table (enhance existing)
- create_course_progress_table
- create_course_prerequisites_table
- create_course_learning_objectives_table
- create_course_certificates_table
- create_course_offline_content_table
```

---

### 3. **Leaderboard System (COMPLETELY MISSING)**

#### **Missing Models:**
```php
// app/Models/QuizLeaderboard.php
- id, quiz_id, user_id, score, completion_time, attempts, rank, badges, updated_at

// app/Models/CourseLeaderboard.php
- id, course_id, user_id, final_grade, completion_time, lessons_completed, rank, badges, updated_at

// app/Models/SellerLeaderboard.php
- id, author_id, total_revenue, total_sales, average_rating, content_count, rank, badges, updated_at

// app/Models/ReviewLeaderboard.php
- id, content_id, content_type, average_rating, review_count, helpful_votes, rank, updated_at

// app/Models/Achievement.php
- id, user_id, type, title, description, icon, earned_at, badge_level

// app/Models/LeaderboardPeriod.php
- id, type, period, start_date, end_date, is_active
```

#### **Missing Controllers:**
```php
// app/Http/Controllers/Api/LeaderboardController.php
// app/Http/Controllers/Api/AchievementController.php
```

#### **Missing Migrations:**
```sql
- create_quiz_leaderboards_table
- create_course_leaderboards_table
- create_seller_leaderboards_table
- create_review_leaderboards_table
- create_achievements_table
- create_leaderboard_periods_table
```

---

### 4. **Enhanced Quiz Features (PARTIALLY MISSING)**

#### **Missing Models:**
```php
// app/Models/QuizSection.php
- id, quiz_id, title, description, order, created_at, updated_at

// app/Models/QuizAttemptTracking.php (enhance existing)
- Add is_tracked field to distinguish user vs admin attempts
- Add tracking metadata for leaderboards
```

#### **Missing Controllers:**
```php
// app/Http/Controllers/Api/QuizSectionController.php
```

#### **Missing Migrations:**
```sql
- create_quiz_sections_table
- add_tracking_fields_to_quiz_attempts_table
```

---

## 🔶 **MEDIUM PRIORITY MISSING FEATURES**

### 5. **Advanced Financial System**

#### **Missing Models:**
```php
// app/Models/Invoice.php
- id, user_id, order_id, invoice_number, amount, tax_amount, total_amount, status, issued_at, paid_at, created_at, updated_at

// app/Models/TaxRate.php
- id, name, rate_percentage, applicable_to, country_code, state_code, created_at, updated_at

// app/Models/Commission.php
- id, author_id, content_type, content_id, amount, percentage, status, processed_at, created_at, updated_at

// app/Models/SubscriptionPlan.php
- id, name, description, price, duration_months, features, is_active, created_at, updated_at

// app/Models/UserSubscription.php
- id, user_id, plan_id, status, starts_at, ends_at, auto_renew, created_at, updated_at
```

#### **Missing Controllers:**
```php
// app/Http/Controllers/Api/InvoiceController.php
// app/Http/Controllers/Api/TaxController.php
// app/Http/Controllers/Api/CommissionController.php
// app/Http/Controllers/Api/SubscriptionController.php
```

---

### 6. **Content Moderation System**

#### **Missing Models:**
```php
// app/Models/ContentReport.php
- id, reporter_id, content_type, content_id, reason, description, status, created_at, updated_at

// app/Models/ContentViolation.php
- id, content_type, content_id, violation_type, severity, action_taken, moderator_id, created_at, updated_at

// app/Models/ModerationAction.php
- id, violation_id, action_type, description, moderator_id, created_at, updated_at
```

#### **Missing Controllers:**
```php
// app/Http/Controllers/Api/ContentReportController.php
// app/Http/Controllers/Api/ContentModerationController.php
```

---

## 🔷 **LOW PRIORITY MISSING FEATURES**

### 7. **Analytics & Reporting System**

#### **Missing Models:**
```php
// app/Models/UserAnalytics.php
- id, user_id, event_type, event_data, timestamp, created_at

// app/Models/ContentAnalytics.php
- id, content_type, content_id, views, completions, ratings, revenue, period, created_at, updated_at

// app/Models/PlatformAnalytics.php
- id, metric_name, metric_value, period, created_at, updated_at
```

#### **Missing Controllers:**
```php
// app/Http/Controllers/Api/AnalyticsController.php
```

---

### 8. **Notification System**

#### **Missing Models:**
```php
// app/Models/Notification.php
- id, user_id, type, title, message, data, is_read, created_at, updated_at

// app/Models/NotificationTemplate.php
- id, name, subject, body, variables, is_active, created_at, updated_at
```

#### **Missing Controllers:**
```php
// app/Http/Controllers/Api/NotificationController.php
```

---

## 📊 **IMPLEMENTATION PRIORITY MATRIX**

| Feature | Priority | Complexity | Impact | Estimated Time |
|---------|----------|------------|---------|----------------|
| Review System | HIGH | Medium | High | 2-3 weeks |
| Course System | HIGH | High | High | 4-5 weeks |
| Leaderboard System | HIGH | Medium | Medium | 2-3 weeks |
| Quiz Sections | HIGH | Low | Medium | 1 week |
| Financial Enhancements | MEDIUM | High | Medium | 3-4 weeks |
| Content Moderation | MEDIUM | Medium | Medium | 2 weeks |
| Analytics | LOW | High | Low | 2-3 weeks |
| Notifications | LOW | Medium | Low | 1-2 weeks |

---

## 🎯 **RECOMMENDED IMPLEMENTATION ORDER**

### **Phase 1: Core Features (Weeks 1-8)**
1. **Review System** - Complete review and rating functionality
2. **Course System** - Full course creation and management
3. **Enhanced Quiz Features** - Quiz sections and better attempt tracking

### **Phase 2: Engagement Features (Weeks 9-12)**
4. **Leaderboard System** - All leaderboard types and achievements
5. **Content Moderation** - Reporting and moderation tools

### **Phase 3: Business Features (Weeks 13-16)**
6. **Advanced Financial System** - Invoices, taxes, subscriptions
7. **Analytics & Reporting** - Comprehensive analytics

### **Phase 4: Enhancement Features (Weeks 17-18)**
8. **Notification System** - User notifications and templates

---

## 📝 **IMPLEMENTATION NOTES**

### **Database Considerations:**
- All new models should follow Laravel conventions
- Use proper foreign key constraints
- Implement soft deletes where appropriate
- Add proper indexes for performance

### **API Design:**
- Follow RESTful conventions
- Implement proper validation
- Add rate limiting for sensitive endpoints
- Use Laravel Sanctum for authentication

### **Security Considerations:**
- Validate all inputs
- Implement proper authorization
- Use CSRF protection
- Add audit logging for sensitive operations

### **Performance Considerations:**
- Use database indexes appropriately
- Implement caching where beneficial
- Use eager loading to prevent N+1 queries
- Consider pagination for large datasets

---

## 🔗 **RELATED DOCUMENTATION**

- [REQUIREMENTS.md](../quiz/REQUIREMENTS.md) - Complete system requirements
- [DEVELOPMENT_TASKS.md](../quiz/DEVELOPMENT_TASKS.md) - Frontend development tasks
- [database_diagram.mmd](docs/database_diagram.mmd) - Current database schema

---

**Next Action:** Start implementing the Review System as it's the most critical missing feature for user engagement and content quality.
