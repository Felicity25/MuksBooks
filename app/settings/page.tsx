import { SectionShell } from '@/components/section-shell'
import { SettingsManager } from '@/components/settings-manager'

export default function SettingsPage() {
  return (
    <SectionShell title="Settings" description="Manage profile, onboarding, interface and study preferences" actionLabel="Update settings">
      <SettingsManager />
    </SectionShell>
  )
}
