import type { ShiftSummaryDto, StationDto, StationState } from '@shared';
import { Kpis } from '../components/Kpis';
import { StationCard, type CardAction } from '../components/StationCard';

interface Props {
  stations: StationDto[];
  states: StationState[];
  summary: ShiftSummaryDto | null;
  now: number;
  onAction: (action: CardAction, station: StationDto) => void;
}

export function Dashboard({ stations, states, summary, now, onAction }: Props) {
  return (
    <section className="view">
      <Kpis stations={stations} states={states} summary={summary} now={now} />
      <div className="grid">
        {stations.map((st, i) => (
          <StationCard key={st.id} station={st} state={states[i] ?? 'free'} now={now} onAction={onAction} />
        ))}
      </div>
      <p className="note">
        Datos de ejemplo para la demostración. Tarifa $50 por persona por hora. El paquete "Demo 3 min" avisa a 1 minuto; los paquetes normales avisan a 5 minutos.
      </p>
    </section>
  );
}
