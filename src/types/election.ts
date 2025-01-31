```typescript
export interface ElectionResult {
  id: number;
  aa_eleicao: number | null;
  cd_tipo_eleicao: number | null;
  nm_tipo_eleicao: string | null;
  cd_eleicao: number | null;
  ds_eleicao: string | null;
  dt_eleicao: string | null;
  sg_uf: string | null;
  cd_municipio: number | null;
  nm_municipio: string | null;
  nr_zona: number | null;
  nm_local_votacao: string | null;
  ds_local_votacao_endereco: string | null;
  nr_turno: number | null;
  ds_cargo: string | null;
  nr_votavel: number | null;
  nm_votavel: string | null;
  sq_candidato: string | null;
  qt_aptos: number | null;
  qt_comparecimento: number | null;
  qt_abstencoes: number | null;
  qt_votos_nominais: number | null;
  qt_votos: number | null;
  dt_carga: string | null;
  qt_registros: number | null;
}

export interface ElectionFilters {
  sg_uf?: string;
  nm_municipio?: string;
  nr_zona?: number;
  nm_local_votacao?: string;
  ds_cargo?: string;
  nr_votavel?: number;
  nm_votavel?: string;
}

export interface ElectionStats {
  qt_aptos: number;
  qt_comparecimento: number;
  qt_abstencoes: number;
  qt_votos_nominais: number;
  qt_votos: number;
}

export interface FilterOptions {
  ufs: string[];
  municipios: string[];
  zonas: number[];
  locaisVotacao: string[];
  cargos: string[];
}
```