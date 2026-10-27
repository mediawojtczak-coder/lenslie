import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function Logowanie() {
  const { user } = await getUser();
  if (user) redirect("/panel");

  return (
    <section className="narrow">
      <h1>Witaj ponownie</h1>
      <p className="lead">Zaloguj się, aby zarządzać galeriami.</p>
      <LoginForm />
    </section>
  );
}
