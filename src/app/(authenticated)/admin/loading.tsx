import { GearSpinner } from "@/components/ui/gear-spinner";

export default function AdminLoading() {
  // spinner-full lets the admin column widen to full width while loading,
  // so the spinner is centered on the page like it is for students.
  return (
    <div className="spinner-full">
      <GearSpinner />
    </div>
  );
}
