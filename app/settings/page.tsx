import { SectionShell } from '@/components/section-shell'
import { SettingsManager } from '@/components/settings-manager'

export default function SettingsPage() {
  return (
    <SectionShell title="Personalisation" description="Profile, appearance, onboarding, and study preferences" actionLabel="Update settings">
      <SettingsManager />
    </SectionShell>
  )
}
