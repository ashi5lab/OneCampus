import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, Users, GraduationCap, School } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAllFeatureLinks } from '../hooks/useNavLinks';
import { useLearners } from '../features/learners/hooks/useLearners';
import { useInstructors } from '../features/instructors/hooks/useInstructors';
import { useCohorts } from '../features/cohorts/hooks/useCohorts';
import { Avatar } from './Avatar';

export function OmniSearch({ placeholder = "Search students, class, apps ..", value, onChange }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  
  const [internalQuery, setInternalQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  
  const query = value !== undefined ? value : internalQuery;
  const setQuery = onChange || setInternalQuery;

  const links = useAllFeatureLinks();
  
  // Conditionally fetch based on permissions to prevent 403s
  const { data: learnersData } = useLearners({ enabled: can('learners.view') || can('learners.manage') });
  const { data: instructorsData } = useInstructors({ enabled: can('instructors.view') || can('instructors.manage') });
  const { data: cohortsData } = useCohorts({ enabled: can('cohorts.view') || can('cohorts.manage') });

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const q = query.trim().toLowerCase();
    const combined = [];

    // Search Apps/Features
    const matchedLinks = links.filter(l => l.label.toLowerCase().includes(q)).slice(0, 3);
    if (matchedLinks.length > 0) {
      combined.push({ category: 'Apps & Features', items: matchedLinks.map(l => ({ ...l, type: 'app', icon: Grid })) });
    }

    // Search Students
    const matchedStudents = (learnersData || [])
      .filter(l => `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) || (l.registry_no || '').toLowerCase().includes(q))
      .slice(0, 3);
    
    if (matchedStudents.length > 0) {
      combined.push({ 
        category: 'Students', 
        items: matchedStudents.map(l => ({ 
          id: l.id, 
          label: `${l.first_name} ${l.last_name}`, 
          subtitle: l.registry_no || 'No roll number', 
          to: `/app/learners/${l.id}`, 
          type: 'student', 
          icon: GraduationCap,
          avatar: l.photo_url
        })) 
      });
    }

    // Search Teachers
    const matchedTeachers = (instructorsData || [])
      .filter(t => `${t.first_name} ${t.last_name}`.toLowerCase().includes(q))
      .slice(0, 3);
      
    if (matchedTeachers.length > 0) {
      combined.push({ 
        category: 'Teachers', 
        items: matchedTeachers.map(t => ({ 
          id: t.id, 
          label: `${t.first_name} ${t.last_name}`, 
          subtitle: t.department || 'Staff', 
          to: `/app/instructors/${t.id}`, 
          type: 'teacher', 
          icon: Users,
          avatar: t.photo_url
        })) 
      });
    }

    // Search Classes
    const matchedClasses = (cohortsData || [])
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 3);
      
    if (matchedClasses.length > 0) {
      combined.push({ 
        category: 'Classes', 
        items: matchedClasses.map(c => ({ 
          id: c.id, 
          label: c.name, 
          subtitle: 'Class', 
          to: `/app/cohorts/${c.id}`, // or `/app/class/${c.id}` depending on role
          type: 'class', 
          icon: School 
        })) 
      });
    }

    return combined;
  }, [query, links, learnersData, instructorsData, cohortsData]);

  const hasResults = results.length > 0;

  function goTo(to) {
    setQuery('');
    setOpen(false);
    navigate(to);
  }

  return (
    <div className="flex-1 relative">
      <Search className="w-[22px] h-[22px] text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
      <input 
        ref={inputRef}
        type="text" 
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full h-[50px] bg-white text-gray-900 rounded-full pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#9b7ffc]/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-50 transition-shadow"
      />
      
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-border bg-white shadow-xl max-h-[400px] overflow-y-auto">
          {!hasResults ? (
            <div className="px-4 py-6 text-center text-[13px] text-gray-500">No results found for "{query}"</div>
          ) : (
            <div className="py-2">
              {results.map((group) => (
                <div key={group.category} className="mb-2 last:mb-0">
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {group.category}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.to}
                        type="button"
                        onMouseDown={() => goTo(item.to)}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                      >
                        {item.avatar !== undefined ? (
                          <Avatar name={item.label} src={item.avatar} size={32} className="flex-shrink-0" />
                        ) : (
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600`}>
                            <Icon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-gray-900">{item.label}</div>
                          {item.subtitle && (
                            <div className="truncate text-[11px] text-gray-500">{item.subtitle}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
