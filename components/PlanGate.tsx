interface Props {
  moduleKey: string;
  requiredPlan?: string;
  children: React.ReactNode;
}

export function PlanGate({ children }: Props) {
  return <>{children}</>;
}
