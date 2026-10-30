import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase, SUPABASE_TABLE } from "../lib/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import DynamicForm from "../components/DynamicForm";
import { FormConfigService } from "../lib/formConfigService";
import { sendSampadaHandoff } from "../lib/sampadaHandoff";
import { ArrowLeft } from 'lucide-react';
import { useI18n } from "../lib/i18n";
import toast from 'react-hot-toast';

function Intake() {
  const { user } = useUser();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [formConfig, setFormConfig] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
    const [currentFormConfig, setCurrentFormConfig] = useState(null);

  useEffect(() => {
    async function loadFormConfigAndProfile() {
      try {
        // Load active form configuration exactly as saved by admin
        let config = await FormConfigService.getActiveFormConfig() || { fields: [] };

        console.log("Enhanced form config loaded:", config);

        setFormConfig(config);
        setCurrentFormConfig(config);

        // Get user's email for debugging and initialization
        const userEmail = user?.primaryEmailAddress?.emailAddress;
        console.log("User email from Clerk:", userEmail);

        // Initialize form with user's basic info
        const initialFormData = {
          name: user?.fullName || "",
          email: userEmail || "",
        };

        // Load existing profile if user is logged in
        if (user?.id) {
          console.log("Loading profile for user_id:", user.id);

          // First try to find by user_id
          let { data, error: profileError } = await supabase
            .from(SUPABASE_TABLE)
            .select("*")
            .eq("user_id", user.id)
            .single();

          // If not found by user_id, try by email (for legacy records)
          if (profileError && profileError.code === "PGRST116" && userEmail) {
            console.log(
              "No record found by user_id, trying by email:",
              userEmail
            );
            const emailResult = await supabase
              .from(SUPABASE_TABLE)
              .select("*")
              .eq("email", userEmail)
              .single();

            data = emailResult.data;
            profileError = emailResult.error;

            // If found by email, update it to include user_id for future queries
            if (data && !profileError) {
              console.log(
                "Found legacy record by email, updating with user_id"
              );
              await supabase
                .from(SUPABASE_TABLE)
                .update({ user_id: user.id })
                .eq("email", userEmail);
            }
          }

          console.log("Profile query result:", { data, error: profileError });

          if (data && data.responses) {
            setIsEditing(true);
            const existingForm = {
              ...data.responses,
              name: data.name || user?.fullName || "",
              email: data.email || userEmail,
            };

            // Convert arrays back to comma-separated strings for certain fields
            if (
              existingForm.current_skills &&
              Array.isArray(existingForm.current_skills)
            ) {
              existingForm.current_skills =
                existingForm.current_skills.join(", ");
            }
            if (
              existingForm.interests &&
              Array.isArray(existingForm.interests)
            ) {
              existingForm.interests = existingForm.interests.join(", ");
            }

            console.log("Setting existing form data:", existingForm);
            setFormData(existingForm);

                      } else {
            console.log("No existing profile found, setting initial form data");
            setFormData(initialFormData);
          }
        }
      } catch (err) {
        console.error("Error loading form config or profile:", err);
        setError("Failed to load form configuration");
      } finally {
        setLoadingProfile(false);
      }
    }

    if (user) {
      loadFormConfigAndProfile();
    }
  }, [user]);
  // Handle field changes
  const handleFieldChange = (fieldName, fieldValue, updatedFormData) => {
    setFormData(updatedFormData);
  };

  async function submit(formData) {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("Submitting form data:", formData);

      // Prepare the data for submission
      const submissionData = {
        user_id: user.id,
        name: formData.name || user?.fullName || "",
        email: formData.email || user?.primaryEmailAddress?.emailAddress || "",
        responses: {
          ...formData,
          // Store field_of_study in responses object as per database schema
          field_of_study: formData.field_of_study,
          class_level: formData.class_level,
          learning_goals: formData.learning_goals
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Remove name and email from responses since they're top-level fields
      delete submissionData.responses.name;
      delete submissionData.responses.email;

      console.log("Prepared submission data:", submissionData);

      let result;
      if (isEditing) {
        // Update existing record
        result = await supabase
          .from(SUPABASE_TABLE)
          .update({
            name: submissionData.name,
            email: submissionData.email,
            responses: submissionData.responses,
            updated_at: submissionData.updated_at,
          })
          .eq("user_id", user.id);
      } else {
        // Insert new record
        result = await supabase
          .from(SUPABASE_TABLE)
          .insert([submissionData]);
      }

      const { error: supabaseError } = result;

      if (supabaseError) {
        console.error("Supabase error:", supabaseError);
        throw supabaseError;
      }

      
      setSuccess(
        isEditing
          ? "Profile updated successfully!"
          : "Assessment submitted successfully!"
      );

      toast.success(
        isEditing
          ? "Your profile has been updated!"
          : "Your assessment has been submitted!"
      );

      // Abhiruchi -> Sampada handoff (BHIV vNEXT step 1). Idempotent on the
      // Clerk user id, so edits re-send safely without duplicating candidates.
      // Fire-and-report: never blocks or fails the candidate's own save.
      sendSampadaHandoff({
        userId: user.id,
        email: submissionData.email,
        formData: submissionData.responses,
      })
        .then((r) => {
          if (r?.ok) {
            console.log(
              "[Sampada handoff] accepted:",
              r.sampada_local_id || r.detail,
              r.warnings?.length ? r.warnings : ""
            );
          } else {
            console.warn("[Sampada handoff] not delivered:", r?.detail);
          }
        })
        .catch((err) => console.warn("[Sampada handoff] error:", err));

      // Navigate to assignment page after short delay
      setTimeout(() => {
        navigate("/assignment");
      }, 1500);
    } catch (err) {
      console.error("Submission error:", err);
      const errorMessage = err.message || "An unexpected error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>{t('intake.loadingForm')}</p>
        </div>
      </div>
    );
  }

  if (!currentFormConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <p>{t('intake.formConfigNotAvailable')}</p>
          <Link to="/dashboard" className="text-orange-400 hover:text-orange-300 mt-2 inline-block">
            {t('intake.returnToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  {isEditing ? t('intake.backToDashboard') : t('intake.back')}
                </Link>
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2">
                {isEditing ? t('intake.editYourProfile') : t('intake.welcomeToGurukul')}
              </h1>
              <p className="text-white/70">
                {isEditing 
                  ? t('intake.updateInfo') 
                  : t('intake.tellUsAboutYou')
                }
              </p>
              
                          </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-400/30 rounded-xl text-green-200">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>{success}</span>
                </div>
              </div>
            )}

            {/* Dynamic Form */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
              <DynamicForm
                config={currentFormConfig}
                onSubmit={submit}
                initialData={formData}
                isLoading={loading}
                onFieldChange={handleFieldChange}
              />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Intake;
