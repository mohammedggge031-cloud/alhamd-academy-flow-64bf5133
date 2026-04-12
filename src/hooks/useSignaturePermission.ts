import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SETTING_KEY_PREFIX = "signature_enabled:";

export function useSignaturePermission() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  // Check if current user's signature is enabled
  const { data: myEnabled = false } = useQuery({
    queryKey: ["signature-permission", user?.id],
    enabled: !!user?.id && (isAdmin || isManager),
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_settings")
        .select("value")
        .eq("key", SETTING_KEY_PREFIX + user!.id)
        .maybeSingle();
      return data?.value === "true";
    },
  });

  // Admin: fetch all manager signature statuses
  const { data: managerStatuses = [] } = useQuery({
    queryKey: ["manager-signature-statuses"],
    enabled: isAdmin,
    queryFn: async () => {
      // Get all managers
      const { data: managers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "manager");
      if (!managers?.length) return [];

      const managerIds = managers.map((m) => m.user_id);

      // Get their profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", managerIds);

      // Get their signature settings
      const keys = managerIds.map((id) => SETTING_KEY_PREFIX + id);
      const { data: settings } = await supabase
        .from("academy_settings")
        .select("key, value")
        .in("key", keys);

      const settingsMap = new Map(settings?.map((s) => [s.key, s.value]) ?? []);

      return (profiles ?? []).map((p) => ({
        userId: p.user_id,
        name: p.full_name,
        enabled: settingsMap.get(SETTING_KEY_PREFIX + p.user_id) === "true",
      }));
    },
  });

  const toggleSignature = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const key = SETTING_KEY_PREFIX + userId;
      const { data: existing } = await supabase
        .from("academy_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("academy_settings")
          .update({ value: enabled ? "true" : "false", updated_by: user!.id })
          .eq("key", key);
      } else {
        await supabase
          .from("academy_settings")
          .insert({ key, value: enabled ? "true" : "false", updated_by: user!.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature-permission"] });
      queryClient.invalidateQueries({ queryKey: ["manager-signature-statuses"] });
    },
  });

  return {
    myEnabled,
    isAdmin,
    isManager,
    canToggleSelf: isAdmin,
    canUseSignature: isAdmin ? myEnabled : (isManager && myEnabled),
    managerStatuses,
    toggleMy: (enabled: boolean) => {
      if (user) toggleSignature.mutate({ userId: user.id, enabled });
    },
    toggleManager: (managerId: string, enabled: boolean) => {
      if (isAdmin) toggleSignature.mutate({ userId: managerId, enabled });
    },
  };
}
