export interface AuthorSummary {
  id: string; // e.g. "https://openalex.org/A5023880860"
  shortId: string; // e.g. "A5023880860"
  displayName: string;
  worksCount: number;
  citedByCount: number;
  hIndex: number;
  i10Index: number;
  institutions: {
    displayName: string;
    countryCode?: string;
  }[];
  countsByYear: {
    year: number;
    worksCount: number;
    citedByCount: number;
  }[];
  topics: {
    name: string;
    count: number;
    field?: string;
  }[];
}

export interface WorkItem {
  id: string; // e.g. "https://openalex.org/W2741809807"
  title: string;
  publicationYear: number;
  citedByCount: number;
  journalName: string;
  doi?: string;
  landingPageUrl?: string;
  concepts: {
    name: string;
    level: number;
    score: number;
  }[];
  topics: {
    name: string;
    subfield?: string;
    field?: string;
  }[];
}

export interface JournalItem {
  name: string;
  count: number;
}

export interface FieldItem {
  name: string;
  count: number;
}

export interface TopicItem {
  name: string;
  count: number;
  subfield?: string;
  field?: string;
}

export interface AuthorFullData extends AuthorSummary {
  color: string;
  lightColor: string;
  works: WorkItem[];
  top10Works: WorkItem[];
  top10Journals: JournalItem[];
  top10Fields: FieldItem[];
  top10Topics: TopicItem[];
  isLoadingWorks?: boolean;
  isCached?: boolean;
  loadingProgress?: {
    current: number;
    total: number;
    percent: number;
    page: number;
  };
}

export interface VectorPoint {
  id: string;
  authorId: string;
  authorName: string;
  type: 'paper' | 'researcher';
  title: string;
  x: number;
  y: number;
  color: string;
  lightColor: string;
  citedByCount?: number;
  year?: number;
  journalName?: string;
}

export interface EmbeddingProgress {
  status: 'idle' | 'loading_model' | 'embedding' | 'projecting' | 'completed' | 'error';
  message: string;
  percent: number;
}
