"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { RolePermissionsEditor } from "@/components/settings/role-permissions-editor";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Business profile, currency, and role permissions.</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <BusinessProfileForm />
        </TabsContent>

        <TabsContent value="roles">
          <RolePermissionsEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
