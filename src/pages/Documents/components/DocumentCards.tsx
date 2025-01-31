import React from 'react';
import { FileText, BookOpen, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDocumentCounts } from '../../../hooks/useDocumentCounts';

export function DocumentCards() {
  const navigate = useNavigate();
  const { oficiosCount, projetosLeiCount, requerimentosCount, isLoading } = useDocumentCounts();

  const cards = [
    {
      title: 'Ofícios',
      description: 'Gerencie todos os ofícios do gabinete',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
      hoverBg: 'hover:bg-blue-50/80',
      count: oficiosCount,
      onClick: () => navigate('/app/documentos/oficios')
    },
    {
      title: 'Projetos de Lei',
      description: 'Acompanhe e crie projetos de lei',
      icon: BookOpen,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-emerald-600',
      hoverBg: 'hover:bg-emerald-50/80',
      count: projetosLeiCount,
      onClick: () => navigate('/app/documentos/projetos-lei')
    },
    {
      title: 'Requerimentos',
      description: 'Gerencie os requerimentos do gabinete',
      icon: FileSpreadsheet,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      gradientFrom: 'from-violet-500',
      gradientTo: 'to-violet-600',
      hoverBg: 'hover:bg-violet-50/80',
      count: requerimentosCount,
      onClick: () => navigate('/app/documentos/requerimentos')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <button
            key={index}
            onClick={card.onClick}
            className={`group relative flex flex-col p-8 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 text-left h-48 overflow-hidden ${card.hoverBg}`}
          >
            {/* Gradient decoration */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-10 rounded-bl-full transform translate-x-8 -translate-y-8`} />
            
            {/* Icon container */}
            <div className={`relative z-10 flex items-center justify-between mb-6`}>
              <div className={`p-3 rounded-xl ${card.bgColor} backdrop-blur-sm ring-1 ring-black/5`}>
                <Icon className={`w-8 h-8 ${card.color}`} />
              </div>
              {/* Count badge */}
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 rounded-full animate-pulse" />
              ) : (
                <span className={`flex items-center h-8 px-4 rounded-full ${card.bgColor} ${card.color} font-semibold text-sm ring-1 ring-black/5`}>
                  {card.count}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-800">
                {card.title}
              </h3>
              <p className="text-base text-gray-600 group-hover:text-gray-700">
                {card.description}
              </p>
            </div>

            {/* Bottom decoration */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${card.bgColor}`} />
          </button>
        );
      })}
    </div>
  );
}
