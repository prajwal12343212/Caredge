import { supabaseServer } from "./supabase-server";
import { evaluateAITThreat } from "./ai-security";

export type AuditAction = 
  | "PATIENT_LOGIN" 
  | "DOCTOR_LOGIN" 
  | "FAILED_LOGIN"
  | "RECORD_UPLOADED" 
  | "RECORD_DELETED"
  | "TOKEN_GENERATED"
  | "TOKEN_REVOKED"
  | "SESSION_STARTED"
  | "SESSION_EXPIRED"
  | "TREATMENT_ADDED"
  | "TREATMENT_UPDATED"
  | "UNAUTHORIZED_ACCESS"
  | "INVALID_TOKEN"
  | "TOKEN_USED"
  | "TOKEN_REPLAY_REJECTED"
  | "PROFILE_UPDATED"
  | "SCREENSHOT_ATTEMPT";

interface AuditLogParams {
  userId: string;
  userRole: "patient" | "doctor" | "system";
  action: AuditAction;
  patientId?: string;
  doctorId?: string;
  tokenId?: string;
  targetType: "record" | "token" | "treatment" | "session" | "system";
  targetId?: string;
  description: string;
  req?: Request;
}

export async function logAuditEvent(params: AuditLogParams) {
  try {
    let ipAddress = "unknown";
    let deviceInfo = "unknown";

    if (params.req) {
      ipAddress = params.req.headers.get("x-forwarded-for") || "unknown";
      deviceInfo = params.req.headers.get("user-agent") || "unknown";
    }

    const { error } = await supabaseServer.from("audit_logs").insert({
      actor_id: params.userId,
      actor_role: params.userRole,
      action: params.action,
      patient_id: params.patientId || null,
      doctor_id: params.doctorId || null,
      token_id: params.tokenId || null,
      metadata: {
        targetType: params.targetType,
        targetId: params.targetId,
        description: params.description,
        ipAddress,
        deviceInfo
      }
    });

    if (error) {
      console.error("Failed to insert audit log:", error);
    } else {
      // Trigger AI Threat Detection Engine
      await evaluateAITThreat({
        userId: params.userId,
        userRole: params.userRole,
        action: params.action,
        ipAddress,
        description: params.description,
        patientId: params.patientId
      });
    }
  } catch (err) {
    console.error("Audit logging error:", err);
  }
}
