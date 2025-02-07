import { supabaseClient } from '../lib/supabase';
import { Eleitor, EleitorFormData, EleitorFilters } from '../types/eleitor';
import * as XLSX from 'xlsx';

interface ListResponse {
  data: Eleitor[];
  total: number;
  totalPages: number;
  currentPage: number;
}

interface ListAllResponse {
  data: Eleitor[];
  total: number;
  pageSize: number;
  currentPage: number;
}

class EleitorService {
  async list(
    empresa_uid: string, 
    filters: EleitorFilters = {}, 
    page = 1, 
    pageSize = 10,
    usuario_uid?: string | null,
    nivel_acesso?: string | null
  ): Promise<ListResponse> {
    try {
      let query = supabaseClient
        .from('gbp_eleitores')
        .select(`
          *,
          gbp_categorias_eleitor (
            uid,
            nome
          ),
          gbp_indicado (
            uid,
            nome
          )
        `)
        .eq('empresa_uid', empresa_uid);

      // Se o nível de acesso for 'comum' e tiver usuario_uid, filtra por ele
      if (nivel_acesso === 'comum' && usuario_uid) {
        query = query.eq('usuario_uid', usuario_uid);
      }

      // Aplica os filtros
      if (filters.nome) {
        query = query.ilike('nome', `%${filters.nome}%`);
      }
      if (filters.zona) {
        query = query.eq('zona', filters.zona);
      }
      if (filters.secao) {
        query = query.eq('secao', filters.secao);
      }
      if (filters.bairro) {
        query = query.ilike('bairro', `%${filters.bairro}%`);
      }
      if (filters.categoria_uid) {
        query = query.eq('categoria_uid', typeof filters.categoria_uid === 'object' ? filters.categoria_uid.uid : filters.categoria_uid);
      }
      if (filters.logradouro) {
        query = query.ilike('logradouro', `%${filters.logradouro}%`);
      }
      if (filters.indicado) {
        query = query.eq('indicado_uid', filters.indicado);
      }
      if (filters.cep) {
        query = query.eq('cep', filters.cep);
      }
      if (filters.responsavel) {
        console.log('[DEBUG] Aplicando filtro de responsável:', filters.responsavel);
        query = query.eq('usuario_uid', filters.responsavel);
      }
      if (filters.cidade) {
        query = query.ilike('cidade', `%${filters.cidade}%`);
      }
      if (filters.genero) {
        query = query.eq('genero', filters.genero);
      }

      // Aplica ordenação e paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query
        .order('nome', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        if (error.code === 'PGRST301') {
          throw new Error('Sessão expirada');
        }
        throw new Error(error.message);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / pageSize);

      return {
        data: data as Eleitor[] || [],
        total,
        totalPages,
        currentPage: page
      };
    } catch (error) {
      console.error('EleitorService.list - Erro:', error);
      throw error;
    }
  }

  async listAll(
    empresa_uid: string, 
    filters: EleitorFilters = {}, 
    page = 1,
    pageSize = 10
  ): Promise<ListAllResponse> {
    console.log('[DEBUG] EleitorService.listAll - Buscando eleitores:', { empresa_uid, filters, page, pageSize });
    try {
      let query = supabaseClient
        .from('gbp_eleitores')
        .select('*', { count: 'exact' })
        .eq('empresa_uid', empresa_uid);

      // Aplica os filtros
      if (filters.nome) {
        query = query.ilike('nome', `%${filters.nome}%`);
      }
      if (filters.genero) {
        query = query.eq('genero', filters.genero);
      }
      if (filters.zona) {
        query = query.eq('zona', filters.zona);
      }
      if (filters.secao) {
        query = query.eq('secao', filters.secao);
      }
      if (filters.bairro) {
        query = query.eq('bairro', filters.bairro);
      }
      if (filters.categoria_id) {
        query = query.eq('categoria_id', filters.categoria_id);
      }
      if (filters.logradouro) {
        query = query.ilike('logradouro', `%${filters.logradouro}%`);
      }
      if (filters.indicado) {
        query = query.eq('indicado_uid', filters.indicado);
      }
      if (filters.cep) {
        query = query.eq('cep', filters.cep);
      }
      if (filters.responsavel) {
        console.log('[DEBUG] Aplicando filtro de responsável:', filters.responsavel);
        query = query.eq('usuario_uid', filters.responsavel);
      }
      if (filters.cidade) {
        query = query.eq('cidade', filters.cidade);
      }
      if (filters.categoria_uid) {
        query = query.eq('categoria_uid', typeof filters.categoria_uid === 'object' ? filters.categoria_uid.uid : filters.categoria_uid);
      }

      // Aplica paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('[DEBUG] EleitorService.listAll - Erro:', error);
        throw new Error(error.message);
      }

      const result = {
        data: data as Eleitor[],
        total: count || 0,
        currentPage: page,
        pageSize,
      };

      console.log('[DEBUG] EleitorService.listAll - Sucesso:', result);
      return result;
    } catch (error) {
      console.error('[DEBUG] EleitorService.listAll - Erro:', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID inválido');
      }

      console.log('EleitorService.getById - Buscando eleitor por ID:', id);
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('EleitorService.getById - Erro:', error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Eleitor não encontrado');
      }

      console.log('EleitorService.getById - Sucesso:', data);
      return data as Eleitor;
    } catch (error) {
      console.error('EleitorService.getById - Erro:', error);
      throw error;
    }
  }

  async getByIds(empresa_uid: string, ids: number[]) {
    try {
      // Divide os IDs em lotes de 50 para evitar URLs muito longas
      const tamanhoDosLotes = 50;
      const lotes = [];
      for (let i = 0; i < ids.length; i += tamanhoDosLotes) {
        lotes.push(ids.slice(i, i + tamanhoDosLotes));
      }

      let eleitores = [];

      // Busca os dados em lotes
      for (const lote of lotes) {
        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select(`
            id,
            uid,
            nome,
            cpf,
            nascimento,
            genero,
            nome_mae,
            whatsapp,
            telefone,
            titulo,
            zona,
            secao,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            uf,
            latitude,
            longitude,
            created_at,
            categoria_uid,
            indicado_uid,
            responsavel,
            usuario_uid,
            gbp_categorias!categoria_uid (
              uid,
              nome
            ),
            gbp_usuarios!usuario_uid (
              uid,
              nome
            ),
            gbp_indicado!indicado_uid (
              uid,
              nome
            )
          `)
          .eq('empresa_uid', empresa_uid)
          .in('id', lote);

        if (error) {
          console.error('Erro ao buscar lote de eleitores:', error);
          throw error;
        }

        if (data) {
          eleitores = [...eleitores, ...data];
        }
      }

      return { data: eleitores };
    } catch (error) {
      console.error('Erro ao buscar eleitores por IDs:', error);
      throw error;
    }
  }

  async create(data: EleitorFormData): Promise<Eleitor> {
    try {
      const { data: eleitor, error } = await supabaseClient
        .from('gbp_eleitores')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return eleitor;
    } catch (error) {
      console.error('EleitorService.create - Erro:', error);
      throw error;
    }
  }

  async update(uid: string, data: Partial<EleitorFormData>): Promise<Eleitor> {
    try {
      const { data: eleitor, error } = await supabaseClient
        .from('gbp_eleitores')
        .update(data)
        .eq('uid', uid)
        .select()
        .single();

      if (error) throw error;
      return eleitor;
    } catch (error) {
      console.error('EleitorService.update - Erro:', error);
      throw error;
    }
  }

  async delete(uid: string): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .delete()
        .eq('uid', uid);

      if (error) throw error;
    } catch (error) {
      console.error('EleitorService.delete - Erro:', error);
      throw error;
    }
  }

  async export(empresa_uid: string, filters: EleitorFilters = {}) {
    console.log('EleitorService.export - Exportando eleitores:', empresa_uid, filters);
    const eleitores = await this.listAll(empresa_uid, filters);

    // Preparar dados para exportação
    const data = eleitores.data.map(eleitor => ({
      Nome: eleitor.nome,
      CPF: eleitor.cpf,
      WhatsApp: eleitor.whatsapp,
      Telefone: eleitor.telefone || '',
      Gênero: eleitor.genero || '',
      Zona: eleitor.zona || '',
      Seção: eleitor.secao || '',
      CEP: eleitor.cep || '',
      Logradouro: eleitor.logradouro || '',
      Número: eleitor.numero || '',
      Complemento: eleitor.complemento || '',
      Bairro: eleitor.bairro || '',
      Cidade: eleitor.cidade || '',
      Categoria: eleitor.categoria_id || '',
      Indicação: eleitor.indicacao || '',
    }));

    // Criar planilha
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Eleitores');

    // Gerar arquivo
    XLSX.writeFile(wb, 'eleitores.xlsx');
    console.log('EleitorService.export - Arquivo gerado com sucesso');
  }

  async sendWhatsAppMessage(message: string, empresa_uid: string, filters: EleitorFilters = {}) {
    console.log('EleitorService.sendWhatsAppMessage - Enviando mensagem para eleitores:', empresa_uid, filters);
    const eleitores = await this.listAll(empresa_uid, filters);
    const phoneNumbers = eleitores.data
      .filter(eleitor => eleitor.whatsapp)
      .map(eleitor => eleitor.whatsapp);

    // TODO: Integrar com API do WhatsApp
    console.log('Enviando mensagem para:', phoneNumbers);
    console.log('Mensagem:', message);

    return {
      total: phoneNumbers.length,
      enviados: phoneNumbers.length,
      falhas: 0,
    };
  }

  async getCategoriasOptions(empresa_uid: string) {
    try {
      console.log('[DEBUG] Buscando categorias para empresa:', empresa_uid);
      const { data, error } = await supabaseClient
        .from('gbp_categorias')
        .select('uid, nome')
        .eq('empresa_uid', empresa_uid)
        .order('nome');

      if (error) {
        console.error('[DEBUG] Erro ao buscar categorias:', error);
        throw error;
      }
      console.log('[DEBUG] Categorias encontradas:', data);
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }
  }

  async getIndicadoresOptions(empresa_uid: string) {
    try {
      console.log('[DEBUG] Buscando indicadores para empresa:', empresa_uid);
      const { data, error } = await supabaseClient
        .from('gbp_indicado')
        .select('uid, nome')
        .eq('empresa_uid', empresa_uid)
        .order('nome');

      if (error) {
        console.error('[DEBUG] Erro ao buscar indicadores:', error);
        throw error;
      }
      console.log('[DEBUG] Indicadores encontrados:', data);
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar indicadores:', error);
      return [];
    }
  }

  async getResponsaveisOptions(empresa_uid: string) {
    try {
      console.log('[DEBUG] Service - Buscando responsáveis para empresa:', empresa_uid);
      
      // Primeiro, vamos verificar se existem usuários sem filtros
      const checkQuery = await supabaseClient
        .from('gbp_usuarios')
        .select('count')
        .eq('empresa_uid', empresa_uid);
      
      console.log('[DEBUG] Service - Total de usuários na empresa:', checkQuery.data?.[0]?.count);

      // Agora fazemos a query com os filtros
      const { data, error } = await supabaseClient
        .from('gbp_usuarios')
        .select('uid, nome')
        .eq('empresa_uid', empresa_uid)
        .order('nome');

      if (error) {
        console.error('[DEBUG] Service - Erro ao buscar responsáveis:', error);
        throw error;
      }

      console.log('[DEBUG] Service - Query responsáveis:', {
        empresa_uid,
        total: data?.length || 0
      });
      
      if (!data || data.length === 0) {
        console.log('[DEBUG] Service - Nenhum usuário encontrado para a empresa');
      } else {
        console.log('[DEBUG] Service - Responsáveis encontrados:', JSON.stringify(data, null, 2));
      }

      return data || [];
    } catch (error) {
      console.error('[DEBUG] Service - Erro ao buscar responsáveis:', error);
      return [];
    }
  }

  async getAllIds(empresa_uid: string, filters: EleitorFilters = {}): Promise<number[]> {
    try {
      let query = supabaseClient
        .from('gbp_eleitores')
        .select('id')
        .eq('empresa_uid', empresa_uid);

      // Aplica os filtros
      if (filters.nome) {
        query = query.ilike('nome', `%${filters.nome}%`);
      }
      if (filters.zona) {
        query = query.eq('zona', filters.zona);
      }
      if (filters.secao) {
        query = query.eq('secao', filters.secao);
      }
      if (filters.bairro) {
        query = query.ilike('bairro', `%${filters.bairro}%`);
      }
      if (filters.categoria_uid) {
        query = query.eq('categoria_uid', typeof filters.categoria_uid === 'object' ? filters.categoria_uid.uid : filters.categoria_uid);
      }
      if (filters.logradouro) {
        query = query.ilike('logradouro', `%${filters.logradouro}%`);
      }
      if (filters.indicado) {
        query = query.eq('indicado_uid', filters.indicado);
      }
      if (filters.cep) {
        query = query.eq('cep', filters.cep);
      }
      if (filters.responsavel) {
        console.log('[DEBUG] Aplicando filtro de responsável:', filters.responsavel);
        query = query.eq('usuario_uid', filters.responsavel);
      }
      if (filters.cidade) {
        query = query.ilike('cidade', `%${filters.cidade}%`);
      }
      if (filters.genero) {
        query = query.eq('genero', filters.genero);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST301') {
          throw new Error('Sessão expirada');
        }
        throw new Error(error.message);
      }

      return (data || []).map(item => item.id);
    } catch (error) {
      console.error('Erro ao buscar IDs dos eleitores:', error);
      throw error;
    }
  }

  async checkCpfExists(cpf: string, empresa_uid: string): Promise<boolean> {
    console.log('EleitorService.checkCpfExists - Iniciando com:', { cpf, empresa_uid });
    
    try {
      // Remove caracteres especiais do CPF
      const cleanCpf = cpf.replace(/[^\d]/g, '');
      console.log('EleitorService.checkCpfExists - CPF limpo:', cleanCpf);
      
      // Valida o tamanho do CPF
      if (cleanCpf.length !== 11) {
        console.log('EleitorService.checkCpfExists - CPF inválido:', cleanCpf);
        return false;
      }

      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('id, cpf')
        .eq('cpf', cleanCpf)
        .eq('empresa_uid', empresa_uid)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('EleitorService.checkCpfExists - Erro na consulta:', error);
        return false;
      }

      console.log('EleitorService.checkCpfExists - Resultado da consulta:', data);
      return !!data;
    } catch (error) {
      console.error('EleitorService.checkCpfExists - Erro inesperado:', error);
      return false;
    }
  }

  async getNextAtendimentoNumber(empresa_uid: string): Promise<number> {
    try {
      console.log('[DEBUG] Buscando próximo número de atendimento para empresa:', empresa_uid);
      
      // Busca o último número de atendimento para a empresa
      const { data, error } = await supabaseClient
        .from('gbp_atendimentos')
        .select('numero')
        .eq('empresa_uid', empresa_uid)
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[DEBUG] Erro ao buscar último número de atendimento:', error);
        throw new Error(error.message);
      }

      // Se não houver atendimentos ou o número for null, começa do 1
      const lastNumber = data?.numero ?? 0;
      const nextNumber = lastNumber + 1;
      
      console.log('[DEBUG] Último número encontrado:', lastNumber);
      console.log('[DEBUG] Próximo número será:', nextNumber);
      
      return nextNumber;
    } catch (error) {
      console.error('[DEBUG] Erro ao gerar próximo número de atendimento:', error);
      throw error;
    }
  }

  async createAtendimento(data: any, empresa_uid: string) {
    try {
      console.log('[DEBUG] Iniciando criação de atendimento para empresa:', empresa_uid);
      console.log('[DEBUG] Dados recebidos:', data);

      // Obtém o próximo número de atendimento
      const numero = await this.getNextAtendimentoNumber(empresa_uid);
      console.log('[DEBUG] Número gerado para o atendimento:', numero);

      const atendimentoData = {
        ...data,
        empresa_uid,
        numero,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('[DEBUG] Dados completos do atendimento:', atendimentoData);

      // Cria o atendimento com o número sequencial
      const { data: newAtendimento, error } = await supabaseClient
        .from('gbp_atendimentos')
        .insert([atendimentoData])
        .select()
        .single();

      if (error) {
        console.error('[DEBUG] Erro ao criar atendimento:', error);
        throw new Error(error.message);
      }

      console.log('[DEBUG] Atendimento criado com sucesso:', newAtendimento);
      return newAtendimento;
    } catch (error) {
      console.error('[DEBUG] Erro ao criar atendimento:', error);
      throw error;
    }
  }

  async processImportFile(data: any[], empresa_uid: string, upload_id: number) {
    let retries = 3; // Número de tentativas
    let delay = 1000; // Delay inicial de 1 segundo

    while (retries > 0) {
      try {
        const { error } = await supabaseClient.rpc('process_import_file', {
          p_data: data,
          p_empresa_uid: empresa_uid,
          p_upload_id: upload_id
        });

        if (error) {
          console.error('Erro ao processar arquivo:', error);
          if (retries > 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Aumenta o delay exponencialmente
            retries--;
            continue;
          }
          throw error;
        }

        return { success: true };
      } catch (error: any) {
        if (retries > 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          retries--;
          continue;
        }
        throw new Error(`Erro ao processar arquivo: ${error.message}`);
      }
    }

    throw new Error('Número máximo de tentativas excedido');
  }

  async createPublic(data: {
    nome: string;
    cpf: string;
    data_nascimento: string;
    whatsapp: string;
    telefone: string;
    genero: string;
    titulo_eleitor: string;
    zona: string;
    secao: string;
    cep: string;
    logradouro: string;
    cidade: string;
    bairro: string;
    numero: string;
    complemento: string;
    upload_url: string;
    categoriaId: string;
    empresaUid: string;
  }) {
    try {
      const { data: result, error } = await supabaseClient
        .from('gbp_eleitores')
        .insert([
          {
            nome: data.nome,
            cpf: data.cpf,
            nascimento: data.data_nascimento,
            whatsapp: data.whatsapp,
            telefone: data.telefone,
            genero: data.genero,
            titulo: data.titulo_eleitor,
            zona: data.zona,
            secao: data.secao,
            cep: data.cep,
            logradouro: data.logradouro,
            cidade: data.cidade,
            bairro: data.bairro,
            numero: data.numero,
            complemento: data.complemento,
            upload_url: data.upload_url,
            empresa_uid: data.empresaUid,
            categoria: data.categoriaId
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Erro ao cadastrar eleitor:', error);
      throw error;
    }
  }
}

export const eleitorService = new EleitorService();
