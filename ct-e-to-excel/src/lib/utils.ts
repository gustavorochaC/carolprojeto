import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Obter nome do mês em português
export function getMonthName(month: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1] || '';
}

// Obter mês e ano atual
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
}

// Obter mês e ano de uma data de emissão (formato DD/MM/YYYY)
export function getMonthYearFromDate(dateString: string): { month: number; year: number } | null {
  if (!dateString) return null;
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  if (isNaN(month) || isNaN(year)) return null;
  
  return { month, year };
}

// Verificar se duas datas são do mesmo mês
export function isSameMonth(date1: string, date2: string): boolean {
  const monthYear1 = getMonthYearFromDate(date1);
  const monthYear2 = getMonthYearFromDate(date2);
  
  if (!monthYear1 || !monthYear2) return false;
  
  return monthYear1.month === monthYear2.month && monthYear1.year === monthYear2.year;
}