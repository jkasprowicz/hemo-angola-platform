import type { MethodologyCatalog } from "../../types/submission";

export type CatalogStatusTag =
  | "DEMONSTRATIVO"
  | "CANDIDATO"
  | "VALIDADO POR CONSENSO"
  | "EM PILOTO"
  | "APROVADO";

type PresentationFieldSection = {
  id: string;
  title: string;
  description: string;
  kind: "fields";
  status: CatalogStatusTag;
  fieldCodes: string[];
};

type MatrixColumn = {
  id: string;
  title: string;
};

type MatrixRow = {
  id: string;
  label: string;
  fields: Record<string, string>;
};

type PresentationMatrixSection = {
  id: string;
  title: string;
  description: string;
  kind: "matrix";
  status: CatalogStatusTag;
  columns: MatrixColumn[];
  rows: MatrixRow[];
};

type PresentationSummarySection = {
  id: string;
  title: string;
  description: string;
  kind: "summary";
  status: CatalogStatusTag;
  fieldCodes: string[];
};

export type CollectionPresentationSection =
  | PresentationFieldSection
  | PresentationMatrixSection
  | PresentationSummarySection;

export type CollectionPresentationModule = {
  moduleCode: string;
  title: string;
  description: string;
  sections: CollectionPresentationSection[];
};

const PRESENTATION_MODULES: CollectionPresentationModule[] = [
  {
    moduleCode: "clinical_screening",
    title: "Triagem clínica",
    description:
      "Coleta agregada demonstrativa de triagem e captação. A matriz definitiva permanece dependente de priorização e validação institucional.",
    sections: [
      {
        id: "donation-types",
        title: "Tipo de doação",
        description: "Informe os volumes agregados que sustentam o indicador de doações voluntárias.",
        kind: "fields",
        status: "DEMONSTRATIVO",
        fieldCodes: ["donacoes_voluntarias", "donacoes_reposicao"],
      },
      {
        id: "aptitude-summary",
        title: "Resultado da triagem",
        description: "Esses totais sustentam a taxa de inaptidão clínica no dashboard principal.",
        kind: "fields",
        status: "DEMONSTRATIVO",
        fieldCodes: ["candidatos_aptos", "candidatos_inaptos"],
      },
      {
        id: "donor-profile",
        title: "Perfil do doador",
        description: "Estratificação demonstrativa para arquitetura funcional mais próxima de um sistema real.",
        kind: "fields",
        status: "CANDIDATO",
        fieldCodes: ["doador_primeira_vez", "doador_repeticao"],
      },
      {
        id: "sex-profile",
        title: "Sexo",
        description: "Corte agregado demonstrativo. Não implica matriz definitiva para Angola.",
        kind: "fields",
        status: "CANDIDATO",
        fieldCodes: ["triagem_feminino", "triagem_masculino"],
      },
      {
        id: "ineligibility-causes",
        title: "Causas de inaptidão",
        description: "Catálogo demonstrativo inspirado em referência funcional. Não representa lista validada nacionalmente.",
        kind: "fields",
        status: "CANDIDATO",
        fieldCodes: ["inaptidao_anemia", "inaptidao_outros"],
      },
    ],
  },
  {
    moduleCode: "collection_operations",
    title: "Coleta",
    description: "Base operacional agregada da sessão de coleta.",
    sections: [
      {
        id: "interruptions",
        title: "Interrupções e ocorrências",
        description: "Volumes agregados de interrupção ou dificuldade operacional.",
        kind: "fields",
        status: "DEMONSTRATIVO",
        fieldCodes: [
          "candidatos_desistentes",
          "dificuldade_puncao_venosa",
          "reacao_vagal",
          "interrupcao_outros_motivos",
        ],
      },
      {
        id: "collection-modes",
        title: "Modalidade de coleta",
        description: "Volumes agregados por modalidade.",
        kind: "fields",
        status: "DEMONSTRATIVO",
        fieldCodes: ["coletas_sangue_total", "coletas_aferese"],
      },
    ],
  },
  {
    moduleCode: "laboratory_screening",
    title: "Exames realizados",
    description: "Coleta agregada de triagem laboratorial, com visão resumida e grade demonstrativa por exame.",
    sections: [
      {
        id: "laboratory-summary",
        title: "Resumo laboratorial",
        description: "Esses totais sustentam a taxa de reatividade do dashboard principal.",
        kind: "summary",
        status: "DEMONSTRATIVO",
        fieldCodes: ["amostras_testadas", "amostras_reagentes"],
      },
      {
        id: "exam-grid",
        title: "Exames realizados",
        description: "Configuração demonstrativa inspirada em referência funcional. Não representa matriz obrigatória para Angola.",
        kind: "matrix",
        status: "CANDIDATO",
        columns: [
          { id: "testadas", title: "Testadas" },
          { id: "reagentes", title: "Reagentes" },
        ],
        rows: [
          {
            id: "sifilis",
            label: "Sífilis",
            fields: {
              testadas: "exame_sifilis_testadas",
              reagentes: "exame_sifilis_reagentes",
            },
          },
          {
            id: "hiv",
            label: "HIV",
            fields: {
              testadas: "exame_hiv_testadas",
              reagentes: "exame_hiv_reagentes",
            },
          },
          {
            id: "hbv",
            label: "Hepatite B",
            fields: {
              testadas: "exame_hbv_testadas",
              reagentes: "exame_hbv_reagentes",
            },
          },
        ],
      },
    ],
  },
  {
    moduleCode: "hemotherapy_production",
    title: "Produção hemoterápica",
    description: "Volumes agregados demonstrativos por hemocomponente.",
    sections: [
      {
        id: "production-grid",
        title: "Produção por hemocomponente",
        description: "Estrutura tabular demonstrativa para produção, recebimento e devolução.",
        kind: "matrix",
        status: "CANDIDATO",
        columns: [
          { id: "produzidas", title: "Produzidas" },
          { id: "recebidas", title: "Recebidas" },
          { id: "devolvidas", title: "Devolvidas" },
        ],
        rows: [
          {
            id: "hemacias",
            label: "Concentrado de hemácias",
            fields: {
              produzidas: "producao_hemacias_produzidas",
              recebidas: "producao_hemacias_recebidas",
              devolvidas: "producao_hemacias_devolvidas",
            },
          },
          {
            id: "plaquetas",
            label: "Concentrado de plaquetas",
            fields: {
              produzidas: "producao_plaquetas_produzidas",
              recebidas: "producao_plaquetas_recebidas",
              devolvidas: "producao_plaquetas_devolvidas",
            },
          },
          {
            id: "plasma",
            label: "Plasma",
            fields: {
              produzidas: "producao_plasma_produzidas",
              recebidas: "producao_plasma_recebidas",
              devolvidas: "producao_plasma_devolvidas",
            },
          },
        ],
      },
    ],
  },
  {
    moduleCode: "transfusion_distribution",
    title: "Transfusão / distribuição",
    description: "Coleta agregada demonstrativa para transfusão e distribuição.",
    sections: [
      {
        id: "transfusion-grid",
        title: "Transfusão por hemocomponente",
        description: "Volumes agregados por canal assistencial.",
        kind: "matrix",
        status: "CANDIDATO",
        columns: [
          { id: "ambulatorial", title: "Ambulatorial" },
          { id: "hospitalar", title: "Hospitalar" },
        ],
        rows: [
          {
            id: "transf_hemacias",
            label: "Concentrado de hemácias",
            fields: {
              ambulatorial: "transfusao_hemacias_ambulatorial",
              hospitalar: "transfusao_hemacias_hospitalar",
            },
          },
          {
            id: "transf_plaquetas",
            label: "Concentrado de plaquetas",
            fields: {
              ambulatorial: "transfusao_plaquetas_ambulatorial",
              hospitalar: "transfusao_plaquetas_hospitalar",
            },
          },
        ],
      },
      {
        id: "distribution-grid",
        title: "Distribuição pré-transfusional",
        description: "Estrutura demonstrativa para distribuição com e sem exame pré-transfusional.",
        kind: "fields",
        status: "CANDIDATO",
        fieldCodes: [
          "distribuicao_com_exame_pre_transfusional",
          "distribuicao_sem_exame_pre_transfusional",
        ],
      },
    ],
  },
];

export function getCollectionPresentationModule(moduleCode: string) {
  return PRESENTATION_MODULES.find((module) => module.moduleCode === moduleCode) ?? null;
}

export function getAllPresentationFieldCodes() {
  return PRESENTATION_MODULES.flatMap((module) =>
    module.sections.flatMap((section) => {
      if (section.kind === "matrix") {
        return section.rows.flatMap((row) => Object.values(row.fields));
      }
      return section.fieldCodes;
    }),
  );
}

export function getUnmappedCatalogVariables(catalog: MethodologyCatalog, moduleCode: string) {
  const modulePresentation = getCollectionPresentationModule(moduleCode);
  if (!modulePresentation) {
    return catalog.variables.filter((variable) => variable.module_code === moduleCode);
  }

  const mappedCodes = new Set(
    modulePresentation.sections.flatMap((section) => {
      if (section.kind === "matrix") {
        return section.rows.flatMap((row) => Object.values(row.fields));
      }
      return section.fieldCodes;
    }),
  );

  return catalog.variables.filter(
    (variable) => variable.module_code === moduleCode && !mappedCodes.has(variable.code),
  );
}
