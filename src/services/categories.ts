import { supabaseClient } from '../lib/supabase';

export interface Category {
  uid: string;
  nome: string;
  tipo_uid: string;
  empresa_uid: string;
  created_at: string;
}

export interface CategoryWithType extends Category {
  tipo: {
    uid: string;
    nome: string;
  };
}

export const categoryService = {
  list: async (companyUid: string): Promise<CategoryWithType[]> => {
    const { data, error } = await supabaseClient
      .from('gbp_categorias')
      .select(`
        *,
        tipo:gbp_categoria_tipos(uid, nome)
      `)
      .eq('empresa_uid', companyUid)
      .order('nome');

    if (error) throw error;
    return data || [];
  },

  create: async (category: Omit<Category, 'uid' | 'created_at'>): Promise<Category> => {
    if (!category.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }

    if (!category.tipo_uid) {
      throw new Error('Tipo é obrigatório');
    }

    if (!category.empresa_uid) {
      throw new Error('Empresa não encontrada');
    }

    const { data, error } = await supabaseClient
      .from('gbp_categorias')
      .insert([{
        nome: category.nome.trim(),
        tipo_uid: category.tipo_uid,
        empresa_uid: category.empresa_uid
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (uid: string, updates: Partial<Omit<Category, 'uid' | 'created_at'>>): Promise<Category> => {
    const { data, error } = await supabaseClient
      .from('gbp_categorias')
      .update(updates)
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (uid: string): Promise<void> => {
    const { error } = await supabaseClient
      .from('gbp_categorias')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
  }
};