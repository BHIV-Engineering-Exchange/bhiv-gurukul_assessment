import { supabase, FORM_CONFIG_TABLE } from "./supabaseClient";
import { DynamicFieldService } from "./dynamicFieldService";

// Field types supported by the form builder
export const FIELD_TYPES = {
  TEXT: "text",
  EMAIL: "email",
  NUMBER: "number",
  TEXTAREA: "textarea",
  SELECT: "select",
  RADIO: "radio",
  CHECKBOX: "checkbox",
  MULTI_SELECT: "multi_select",
};

// Student self-classification (BHIV vNEXT — Sir's directive): the candidate
// picks their institute and campus in the intake form itself. Institute
// VALUES are exactly the agreed BHIV codes, so the Sampada handoff maps them
// 1:1 (MSSU is canonical for RTMSSU). Campus values are ordinary labels
// (stored as free text downstream) — seeded with the campuses named by the
// programme and extendable by admins in the form builder.
export const IDENTITY_FIELDS = [
  {
    id: "institute",
    type: FIELD_TYPES.SELECT,
    label: "Institute / University",
    placeholder: "Select your institute",
    required: true,
    order: 5.5,
    section: "academic_info",
    options: [
      { value: "MSSU", label: "RTMSSU (MSSU)" },
      { value: "DYP-A", label: "DYP-A" },
      { value: "SIT-S", label: "SIT-S" },
      { value: "SIPS-S", label: "SIPS-S" },
      { value: "VJTI", label: "VJTI" },
    ],
  },
  {
    id: "campus",
    type: FIELD_TYPES.SELECT,
    label: "Campus",
    placeholder: "Select your campus",
    required: false,
    order: 5.7,
    section: "academic_info",
    options: [
      { value: "Kharghar", label: "Kharghar" },
      { value: "Pune", label: "Pune" },
    ],
  },
];

/** Ensure the institute + campus dropdowns exist in any active form config. */
export function injectIdentityFields(fields) {
  const list = Array.isArray(fields) ? fields : [];
  for (const field of IDENTITY_FIELDS) {
    if (!list.some((f) => f.id === field.id)) {
      list.push({ ...field, options: field.options.map((o) => ({ ...o })) });
    }
  }
  return list;
}

// Default form configuration that matches current intake form
export const DEFAULT_FORM_CONFIG = {
  id: "default",
  name: "Student Intake Form",
  description: "Default student intake form configuration",
  fields: [
    {
      id: "test_radio",
      type: FIELD_TYPES.RADIO,
      label: "Test Radio Buttons (New Styling)",
      required: false,
      order: 0.5,
      options: [
        { value: "option1", label: "Option 1 - Modern Card Style" },
        { value: "option2", label: "Option 2 - Orange Highlight" },
        { value: "option3", label: "Option 3 - Hover Effects" },
      ],
    },
    {
      id: "test_checkbox",
      type: FIELD_TYPES.CHECKBOX,
      label: "Test Checkboxes (New Styling)",
      required: false,
      order: 0.7,
      options: [
        { value: "check1", label: "Checkbox 1 - Custom Design" },
        { value: "check2", label: "Checkbox 2 - Orange Theme" },
        { value: "check3", label: "Checkbox 3 - Multiple Selection" },
      ],
    },
    {
      id: "name",
      type: FIELD_TYPES.TEXT,
      label: "Full Name",
      placeholder: "e.g., Asha Gupta",
      required: true,
      order: 1,
      section: "personal_info",
      validation: {
        minLength: 2,
        maxLength: 100,
      },
    },
    {
      id: "age",
      type: FIELD_TYPES.NUMBER,
      label: "Age",
      placeholder: "17",
      required: false,
      order: 2,
      section: "personal_info",
      validation: {
        min: 5,
        max: 100,
      },
    },
    {
      id: "email",
      type: FIELD_TYPES.EMAIL,
      label: "Email",
      placeholder: "your.email@example.com",
      required: false,
      order: 3,
      section: "personal_info",
    },
    {
      id: "phone",
      type: FIELD_TYPES.TEXT,
      label: "Phone",
      placeholder: "999-000-1234",
      required: false,
      order: 4,
      section: "personal_info",
      validation: {
        pattern: "^[\\d\\s\\-\\+\\(\\)\\.]+$",
      },
    },
    {
      id: "grade",
      type: FIELD_TYPES.SELECT,
      label: "Grade",
      required: true,
      order: 5,
      section: "academic_info",
      options: [
        { value: "grade_9", label: "Grade 9" },
        { value: "grade_10", label: "Grade 10" },
        { value: "grade_11", label: "Grade 11" },
        { value: "grade_12", label: "Grade 12" },
        { value: "undergraduate", label: "Undergraduate" },
        { value: "graduate", label: "Graduate" },
        { value: "postgraduate", label: "Postgraduate" },
        { value: "other", label: "Other" }
      ],
    },
    {
      id: "field_of_study",
      type: FIELD_TYPES.SELECT,
      label: "What field are you studying or working in?",
      placeholder: "Select your field of study",
      required: true,
      order: 6,
      section: "academic_info",
    },
    {
      id: "question_category",
      type: FIELD_TYPES.SELECT,
      label: "Which question category do you prefer?",
      placeholder: "Select a category",
      required: true,
      order: 6.5,
      section: "academic_info",
    },
    {
      id: "current_skills",
      type: FIELD_TYPES.TEXTAREA,
      label: "Current Skills (comma separated)",
      placeholder: "JavaScript, Algebra, Writing",
      required: false,
      order: 7,
      section: "academic_info",
      helpText: "Example: JavaScript, Algebra, Writing",
    },
    {
      id: "interests",
      type: FIELD_TYPES.TEXTAREA,
      label: "Interests (comma separated)",
      placeholder: "Programming, Mathematics, Art",
      required: false,
      order: 8,
      section: "academic_info",
      helpText: "Example: Programming, Mathematics, Art",
    },
    {
      id: "goals",
      type: FIELD_TYPES.TEXTAREA,
      label: "Goals",
      placeholder: "What do you want to achieve?",
      required: false,
      order: 9,
      section: "academic_info",
    },
    {
      id: "preferred_learning_style",
      type: FIELD_TYPES.RADIO,
      label: "Preferred Learning Style",
      required: false,
      order: 10,
      section: "preferences",
      options: [
        { value: "video", label: "Video" },
        { value: "text", label: "Text" },
        { value: "interactive", label: "Interactive" },
        { value: "mixed", label: "Mixed" },
      ],
    },
    {
      id: "availability_per_week_hours",
      type: FIELD_TYPES.NUMBER,
      label: "Availability per week (hours)",
      placeholder: "6",
      required: false,
      order: 11,
      section: "preferences",
      validation: {
        min: 0,
        max: 168,
      },
    },
    {
      id: "experience_years",
      type: FIELD_TYPES.NUMBER,
      label: "Prior experience (years)",
      placeholder: "0",
      required: false,
      order: 12,
      section: "preferences",
      validation: {
        min: 0,
        max: 50,
      },
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_active: true,
};

// Form configuration service
export class FormConfigService {
  // Get dynamic study field options from database
  static async getStudyFieldOptions() {
    try {
      const fields = await DynamicFieldService.getAllFields();
      return fields.map(field => ({
        value: field.field_id,
        label: `${field.icon} ${field.name}`,
      }));
    } catch (error) {
      console.error('Error loading dynamic study fields:', error);
      // Fallback to default options
      return [
        { value: "stem", label: "🔬 STEM (Science, Technology, Engineering, Mathematics)" },
        { value: "business", label: "💼 Business & Economics" },
        { value: "social_sciences", label: "🏛️ Social Sciences" },
        { value: "health_medicine", label: "⚕️ Health & Medicine" },
        { value: "creative_arts", label: "🎨 Creative Arts & Humanities" },
        { value: "other", label: "📚 Other Fields" },
      ];
    }
  }

  // Get the active form configuration with dynamic fields
  static async getActiveFormConfig() {
    try {
      const { data, error } = await supabase
        .from(FORM_CONFIG_TABLE)
        .select("*")
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      // If no active config found, return default with dynamic fields
      if (!data) {
        return await this.getDefaultFormConfigWithDynamicFields();
      }

      // Ensure required core fields exist in all active configs
      data.fields = Array.isArray(data.fields) ? data.fields : [];

      const hasField = (id) => data.fields.some(f => f.id === id);

      // Inject Grade (required) if missing
      if (!hasField('grade')) {
        data.fields.push({
          id: 'grade',
          type: FIELD_TYPES.SELECT,
          label: 'Grade',
          required: true,
          order: 5,
          section: 'academic_info',
          options: [
            { value: 'grade_9', label: 'Grade 9' },
            { value: 'grade_10', label: 'Grade 10' },
            { value: 'grade_11', label: 'Grade 11' },
            { value: 'grade_12', label: 'Grade 12' },
            { value: 'undergraduate', label: 'Undergraduate' },
            { value: 'graduate', label: 'Graduate' },
            { value: 'postgraduate', label: 'Postgraduate' },
            { value: 'other', label: 'Other' }
          ],
        });
      }

      // Inject field_of_study (required, dynamic options) if missing
      if (!hasField('field_of_study')) {
        data.fields.push({
          id: 'field_of_study',
          type: FIELD_TYPES.SELECT,
          label: 'What field are you studying or working in?',
          placeholder: 'Select your field of study',
          required: true,
          order: 6,
          section: 'academic_info',
        });
      }

      // Inject question_category (required) if missing
      if (!hasField('question_category')) {
        data.fields.push({
          id: 'question_category',
          type: FIELD_TYPES.SELECT,
          label: 'Which question category do you prefer?',
          placeholder: 'Select a category',
          required: true,
          order: 6.5,
          section: 'academic_info',
        });
      }

      // Inject institute + campus (student self-classification) if missing
      injectIdentityFields(data.fields);

      // Update field_of_study options with dynamic fields if it exists
      {
        const fieldOfStudyField = data.fields.find(f => f.id === 'field_of_study');
        if (fieldOfStudyField && fieldOfStudyField.type === FIELD_TYPES.SELECT) {
          const dynamicOptions = await this.getStudyFieldOptions();
          fieldOfStudyField.options = dynamicOptions;
        }
      }

      // Sort fields by order within sections if order is present
      data.fields.sort((a, b) => (a.order || 0) - (b.order || 0));

      return data;
    } catch (error) {
      console.error("Error fetching form config:", error);
      return await this.getDefaultFormConfigWithDynamicFields();
    }
  }

  // Get default configuration with dynamic study fields
  static async getDefaultFormConfigWithDynamicFields() {
    const dynamicFieldOptions = await this.getStudyFieldOptions();
    
    const config = {
      ...DEFAULT_FORM_CONFIG,
      fields: DEFAULT_FORM_CONFIG.fields.map(field => {
        if (field.id === 'field_of_study') {
          return {
            ...field,
            options: dynamicFieldOptions
          };
        }
        return field;
      })
    };

    // Student self-classification dropdowns on the default config too
    injectIdentityFields(config.fields);

    return config;
  }

  // Save form configuration
  static async saveFormConfig(config) {
    try {
      // First, deactivate all existing configs
      await supabase
        .from(FORM_CONFIG_TABLE)
        .update({ is_active: false })
        .neq("id", "dummy"); // Update all rows

      // Then insert or update the new config
      const configToSave = {
        ...config,
        updated_at: new Date().toISOString(),
        is_active: true,
      };

      const { data, error } = await supabase
        .from(FORM_CONFIG_TABLE)
        .upsert(configToSave, { onConflict: "id" })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error saving form config:", error);
      throw error;
    }
  }

  // Get all form configurations
  static async getAllFormConfigs() {
    try {
      const { data, error } = await supabase
        .from(FORM_CONFIG_TABLE)
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching all form configs:", error);
      return [];
    }
  }

  // Delete form configuration
  static async deleteFormConfig(id) {
    try {
      const { error } = await supabase
        .from(FORM_CONFIG_TABLE)
        .delete()
        .eq("id", id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error deleting form config:", error);
      throw error;
    }
  }

  // Save configuration as preset (without making it active)
  static async saveAsPreset(config, presetName, presetDescription = "") {
    try {
      const presetConfig = {
        ...config,
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: presetName,
        description: presetDescription,
        is_active: false,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(FORM_CONFIG_TABLE)
        .insert(presetConfig)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error saving preset:", error);
      throw error;
    }
  }

  // Get all presets (non-active configurations)
  static async getAllPresets() {
    try {
      const { data, error } = await supabase
        .from(FORM_CONFIG_TABLE)
        .select("*")
        .eq("is_active", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching presets:", error);
      return [];
    }
  }

  // Load a specific preset by ID
  static async loadPreset(presetId) {
    try {
      const { data, error } = await supabase
        .from(FORM_CONFIG_TABLE)
        .select("*")
        .eq("id", presetId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error loading preset:", error);
      throw error;
    }
  }

  // Update preset metadata (name, description)
  static async updatePresetMetadata(presetId, name, description) {
    try {
      const { data, error } = await supabase
        .from(FORM_CONFIG_TABLE)
        .update({
          name,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", presetId)
        .eq("is_active", false) // Only allow updating presets, not active configs
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error updating preset metadata:", error);
      throw error;
    }
  }

  // Activate a preset (make it the active configuration)
  static async activatePreset(presetId) {
    try {
      // First, deactivate all existing configs
      await supabase
        .from(FORM_CONFIG_TABLE)
        .update({ is_active: false })
        .neq("id", "dummy"); // Update all rows

      // Then activate the selected preset
      const { data, error } = await supabase
        .from(FORM_CONFIG_TABLE)
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", presetId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error activating preset:", error);
      throw error;
    }
  }

  // Initialize default configuration if none exists
  static async initializeDefaultConfig() {
    try {
      const activeConfig = await this.getActiveFormConfig();

      // If we got the default config back, it means no config exists in DB
      if (activeConfig.id === "default") {
        await this.saveFormConfig({
          ...DEFAULT_FORM_CONFIG,
          id: "initial_config",
        });
      }
    } catch (error) {
      console.error("Error initializing default config:", error);
    }
  }

  // Validate form configuration
  static validateFormConfig(config) {
    const errors = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push("Form name is required");
    }

    if (!config.fields || !Array.isArray(config.fields)) {
      errors.push("Fields array is required");
    } else {
      config.fields.forEach((field, index) => {
        if (!field.id || field.id.trim().length === 0) {
          errors.push(`Field ${index + 1}: ID is required`);
        }
        if (!field.type || !Object.values(FIELD_TYPES).includes(field.type)) {
          errors.push(`Field ${index + 1}: Valid field type is required`);
        }
        if (!field.label || field.label.trim().length === 0) {
          errors.push(`Field ${index + 1}: Label is required`);
        }
        // Require dynamic selections for study field and question category
        if (!field.study_field_id || String(field.study_field_id).trim().length === 0) {
          errors.push(`Field ${index + 1}: Study field must be selected`);
        }
        if (!field.category_id || String(field.category_id).trim().length === 0) {
          errors.push(`Field ${index + 1}: Question category must be selected`);
        }
        const dynamicOptionFields = new Set(['field_of_study','question_category']);
        if (
          (field.type === FIELD_TYPES.SELECT ||
            field.type === FIELD_TYPES.RADIO ||
            field.type === FIELD_TYPES.MULTI_SELECT) &&
          !dynamicOptionFields.has(field.id) &&
          (!field.options ||
            !Array.isArray(field.options) ||
            field.options.length === 0)
        ) {
          errors.push(
            `Field ${
              index + 1
            }: Options are required for select/radio/multi-select fields`
          );
        }
      });
    }

    return errors;
  }
}
