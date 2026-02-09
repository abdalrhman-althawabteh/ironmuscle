import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Dumbbell, 
  History as HistoryIcon, 
  LayoutDashboard, 
  Plus, 
  Check, 
  Trash2, 
  Play, 
  ChevronRight, 
  User as UserIcon,
  Timer,
  BrainCircuit,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Workout, Exercise, Set, ViewState, User } from './types';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { getExerciseAdvice, getWorkoutSummaryAnalysis } from './services/geminiService';

// --- MOCK DATA GENERATOR ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  // Data State
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  
  // Active Workout State
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  // --- EFFECTS ---
  
  // Load data from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('ironTrack_user');
    const savedWorkouts = localStorage.getItem('ironTrack_workouts');
    
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedWorkouts) setWorkouts(JSON.parse(savedWorkouts));
  }, []);

  // Save workouts to local storage
  useEffect(() => {
    localStorage.setItem('ironTrack_workouts', JSON.stringify(workouts));
  }, [workouts]);

  // Timer for active workout
  useEffect(() => {
    let interval: number;
    if (activeWorkout) {
      interval = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout]);

  // --- HANDLERS ---

  const handleLogin = (name: string) => {
    const newUser = { id: generateId(), name };
    setUser(newUser);
    localStorage.setItem('ironTrack_user', JSON.stringify(newUser));
  };

  const startWorkout = (type: string) => {
    const newWorkout: Workout = {
      id: generateId(),
      name: type,
      date: new Date().toISOString(),
      exercises: [],
      status: 'active',
      durationSeconds: 0
    };
    setActiveWorkout(newWorkout);
    setElapsedTime(0);
    setCurrentView('ACTIVE_WORKOUT');
    setAiTip(null);
  };

  const addExercise = (name: string) => {
    if (!activeWorkout) return;
    const newExercise: Exercise = {
      id: generateId(),
      name,
      sets: [
        { id: generateId(), weight: 0, reps: 0, completed: false }
      ]
    };
    setActiveWorkout({
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, newExercise]
    });
  };

  const updateSet = (exerciseId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    if (!activeWorkout) return;
    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
      };
    });
    setActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const toggleSetComplete = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;
    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, completed: !s.completed } : s)
      };
    });
    setActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const addSet = (exerciseId: string, previousSet: Set) => {
    if (!activeWorkout) return;
    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: [
          ...ex.sets, 
          { 
            id: generateId(), 
            weight: previousSet.weight, 
            reps: previousSet.reps, 
            completed: false 
          }
        ]
      };
    });
    setActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const removeSet = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;
    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.filter(s => s.id !== setId)
      };
    });
    setActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const finishWorkout = async () => {
    if (!activeWorkout) return;
    
    const completedWorkout: Workout = {
      ...activeWorkout,
      status: 'completed',
      durationSeconds: elapsedTime
    };

    // Attempt to get AI summary (fire and forget mostly for UX speed, or await if needed)
    // For this demo, we just log it or could save it to notes
    const summary = await getWorkoutSummaryAnalysis(
      completedWorkout.name, 
      elapsedTime, 
      completedWorkout.exercises
    );
    console.log("AI Summary:", summary);

    setWorkouts([completedWorkout, ...workouts]);
    setActiveWorkout(null);
    setCurrentView('DASHBOARD');
  };

  const cancelWorkout = () => {
    if (window.confirm("Are you sure? This workout data will be lost.")) {
      setActiveWorkout(null);
      setCurrentView('DASHBOARD');
    }
  };

  const requestAiAdvice = async (exercise: Exercise) => {
    setLoadingTip(true);
    // Find history for this exercise
    const history = workouts
      .flatMap(w => w.exercises)
      .filter(e => e.name.toLowerCase() === exercise.name.toLowerCase());
    
    const advice = await getExerciseAdvice(exercise, history.slice(0, 5));
    setAiTip(`${exercise.name}: ${advice}`);
    setLoadingTip(false);
  };

  // --- HELPERS ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getExerciseHistory = useCallback((exerciseName: string) => {
    // Find the most recent workout that contains this exercise
    for (const w of workouts) {
      const ex = w.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
      if (ex) return ex;
    }
    return null;
  }, [workouts]);

  // --- RENDER VIEWS ---

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Iron<span className="text-orange-500">Track</span></span>
        </div>
        <div className="flex items-center gap-3">
          {activeWorkout && (
             <div className="flex items-center gap-2 bg-orange-900/30 px-3 py-1 rounded-full border border-orange-500/30">
                <Timer className="w-4 h-4 text-orange-500 animate-pulse" />
                <span className="font-mono text-orange-400 font-bold">{formatTime(elapsedTime)}</span>
             </div>
          )}
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <UserIcon className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 max-w-2xl mx-auto w-full">
        {currentView === 'DASHBOARD' && (
          <Dashboard 
            user={user} 
            workouts={workouts} 
            onStartWorkout={startWorkout} 
          />
        )}
        {currentView === 'ACTIVE_WORKOUT' && activeWorkout && (
          <ActiveWorkoutView 
            workout={activeWorkout}
            elapsedTime={elapsedTime}
            onAddExercise={addExercise}
            onUpdateSet={updateSet}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onToggleSet={toggleSetComplete}
            onFinish={finishWorkout}
            onCancel={cancelWorkout}
            getHistory={getExerciseHistory}
            onRequestAi={requestAiAdvice}
            aiTip={aiTip}
            loadingTip={loadingTip}
            closeTip={() => setAiTip(null)}
          />
        )}
        {currentView === 'HISTORY' && (
          <HistoryView workouts={workouts} />
        )}
      </main>

      {/* Bottom Navigation */}
      {!activeWorkout && (
        <nav className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-800 px-6 py-4 flex justify-around items-center z-20 pb-safe">
          <NavButton 
            active={currentView === 'DASHBOARD'} 
            onClick={() => setCurrentView('DASHBOARD')} 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
          />
          <div className="relative -top-6">
            <button 
              onClick={() => setCurrentView('DASHBOARD')} // Usually opens a modal, for now redirects to dashboard to hit start
              className="bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-full shadow-lg shadow-orange-900/50 transition-transform active:scale-95 border-4 border-zinc-950"
            >
              <Plus className="w-8 h-8" />
            </button>
          </div>
          <NavButton 
            active={currentView === 'HISTORY'} 
            onClick={() => setCurrentView('HISTORY')} 
            icon={<HistoryIcon />} 
            label="History" 
          />
        </nav>
      )}
    </div>
  );
};

// --- SUB COMPONENTS ---

const LoginScreen: React.FC<{ onLogin: (name: string) => void }> = ({ onLogin }) => {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-2xl mb-6 shadow-2xl shadow-orange-900/40">
        <Dumbbell className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-4xl font-extrabold text-white mb-2">Iron<span className="text-orange-500">Track</span></h1>
      <p className="text-zinc-400 mb-8 max-w-xs">Track your gains, visualize progress, and crush your limits.</p>
      
      <div className="w-full max-w-sm space-y-4">
        <Input 
          placeholder="Enter your name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className="text-center text-lg"
        />
        <Button 
          size="lg" 
          onClick={() => name && onLogin(name)}
          disabled={!name}
          className={!name ? 'opacity-50' : ''}
        >
          Start Lifting
        </Button>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { size: 24 })}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const Dashboard: React.FC<{ 
  user: User; 
  workouts: Workout[]; 
  onStartWorkout: (type: string) => void;
}> = ({ user, workouts, onStartWorkout }) => {
  
  // Stats
  const totalWorkouts = workouts.length;
  const totalVolume = workouts.reduce((acc, w) => {
    return acc + w.exercises.reduce((eAcc, e) => {
      return eAcc + e.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0);
    }, 0);
  }, 0);

  // Chart Data (Last 7 workouts)
  const chartData = workouts.slice(0, 7).reverse().map(w => ({
    name: new Date(w.date).toLocaleDateString(undefined, { weekday: 'short' }),
    volume: w.exercises.reduce((acc, e) => acc + e.sets.reduce((s, set) => s + (set.weight * set.reps), 0), 0)
  }));

  const workoutTypes = ['Chest Day', 'Back Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body'];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Welcome back, {user.name}</h2>
        <p className="text-zinc-400 text-sm">Ready to crush another session?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-zinc-400">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-xs uppercase font-bold tracking-wider">Workouts</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalWorkouts}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-zinc-400">
            <Dumbbell className="w-4 h-4 text-blue-500" />
            <span className="text-xs uppercase font-bold tracking-wider">Volume (kg)</span>
          </div>
          <p className="text-3xl font-bold text-white">{(totalVolume / 1000).toFixed(1)}k</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <h3 className="text-sm font-bold text-zinc-300 mb-4">Volume Progress</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
               <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                cursor={{fill: '#27272a'}}
              />
              <Bar dataKey="volume" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Start Workout</h3>
        <div className="grid grid-cols-2 gap-3">
          {workoutTypes.map(type => (
            <button
              key={type}
              onClick={() => onStartWorkout(type)}
              className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800 transition-all p-4 rounded-xl text-left flex justify-between items-center group"
            >
              <span className="font-medium text-zinc-300 group-hover:text-white">{type}</span>
              <Play className="w-4 h-4 text-zinc-600 group-hover:text-orange-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ActiveWorkoutView: React.FC<{
  workout: Workout;
  elapsedTime: number;
  onAddExercise: (name: string) => void;
  onUpdateSet: (exId: string, setId: string, field: 'weight' | 'reps', val: number) => void;
  onAddSet: (exId: string, prevSet: Set) => void;
  onRemoveSet: (exId: string, setId: string) => void;
  onToggleSet: (exId: string, setId: string) => void;
  onFinish: () => void;
  onCancel: () => void;
  getHistory: (name: string) => Exercise | null;
  onRequestAi: (ex: Exercise) => void;
  aiTip: string | null;
  loadingTip: boolean;
  closeTip: () => void;
}> = ({ 
  workout, 
  onAddExercise, 
  onUpdateSet, 
  onAddSet, 
  onRemoveSet, 
  onToggleSet, 
  onFinish, 
  onCancel,
  getHistory,
  onRequestAi,
  aiTip,
  loadingTip,
  closeTip
}) => {
  const [newExerciseName, setNewExerciseName] = useState('');
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  const handleAddExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newExerciseName.trim()) {
      onAddExercise(newExerciseName);
      setNewExerciseName('');
      setIsAddingExercise(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Actions */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white">{workout.name}</h2>
          <p className="text-zinc-400 text-sm">{new Date().toLocaleDateString()}</p>
        </div>
        <Button variant="danger" size="sm" onClick={onCancel} className="bg-red-950/30 text-red-400 border-red-900/50">Cancel</Button>
      </div>

      {/* AI Tip Alert */}
      {aiTip && (
        <div className="bg-indigo-900/30 border border-indigo-500/30 p-4 rounded-xl flex gap-3 relative animate-fade-in">
           <BrainCircuit className="w-5 h-5 text-indigo-400 shrink-0 mt-1" />
           <div>
             <h4 className="text-indigo-400 font-bold text-sm mb-1">AI Coach Tip</h4>
             <p className="text-indigo-100 text-sm leading-relaxed">{aiTip}</p>
           </div>
           <button onClick={closeTip} className="absolute top-2 right-2 text-indigo-400 hover:text-white">
             <Plus className="w-4 h-4 rotate-45" />
           </button>
        </div>
      )}

      {/* Exercises List */}
      <div className="space-y-6">
        {workout.exercises.map((exercise, index) => {
          const history = getHistory(exercise.name);
          
          return (
            <div key={exercise.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
              <div className="p-4 bg-zinc-800/50 border-b border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold">
                     {index + 1}
                   </div>
                   <h3 className="font-bold text-lg">{exercise.name}</h3>
                </div>
                <button 
                  onClick={() => onRequestAi(exercise)}
                  disabled={loadingTip}
                  className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                >
                  <BrainCircuit className="w-3 h-3" />
                  {loadingTip ? '...' : 'AI Tip'}
                </button>
              </div>
              
              <div className="p-2">
                {history && (
                  <div className="px-2 py-1 mb-2 text-xs text-zinc-500 flex gap-4">
                    <span>Last: {history.sets.length} sets</span>
                    <span>Best: {Math.max(...history.sets.map(s => s.weight))}kg</span>
                  </div>
                )}
                
                {/* Headers */}
                <div className="grid grid-cols-10 gap-2 px-2 py-1 text-xs uppercase font-bold text-zinc-500 text-center">
                  <div className="col-span-1">Set</div>
                  <div className="col-span-3">kg</div>
                  <div className="col-span-3">Reps</div>
                  <div className="col-span-3">Done</div>
                </div>

                {/* Sets */}
                <div className="space-y-1">
                  {exercise.sets.map((set, setIndex) => (
                    <div 
                      key={set.id} 
                      className={`grid grid-cols-10 gap-2 items-center p-2 rounded-lg transition-colors ${set.completed ? 'bg-green-900/10' : 'bg-zinc-900'}`}
                    >
                      <div className="col-span-1 text-center font-mono text-zinc-500 text-sm">{setIndex + 1}</div>
                      <div className="col-span-3">
                         <input 
                           type="number" 
                           value={set.weight || ''} 
                           placeholder="0"
                           onChange={(e) => onUpdateSet(exercise.id, set.id, 'weight', parseFloat(e.target.value))}
                           className="w-full bg-zinc-950 border border-zinc-700 rounded text-center py-1 text-white font-mono focus:border-orange-500 focus:outline-none"
                         />
                      </div>
                      <div className="col-span-3">
                        <input 
                           type="number" 
                           value={set.reps || ''} 
                           placeholder="0"
                           onChange={(e) => onUpdateSet(exercise.id, set.id, 'reps', parseFloat(e.target.value))}
                           className="w-full bg-zinc-950 border border-zinc-700 rounded text-center py-1 text-white font-mono focus:border-orange-500 focus:outline-none"
                         />
                      </div>
                      <div className="col-span-3 flex justify-center gap-1">
                        <button 
                          onClick={() => onToggleSet(exercise.id, set.id)}
                          className={`w-full h-8 rounded flex items-center justify-center transition-colors ${set.completed ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400'}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        {/* Only show delete if not the only set */}
                        {exercise.sets.length > 1 && (
                             <button onClick={() => onRemoveSet(exercise.id, set.id)} className="w-8 h-8 rounded bg-zinc-800 hover:bg-red-900/50 text-zinc-500 hover:text-red-500 flex items-center justify-center">
                                <Trash2 className="w-3 h-3" />
                             </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 px-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => onAddSet(exercise.id, exercise.sets[exercise.sets.length - 1])}
                    className="w-full py-2 bg-zinc-800/50 border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                  >
                    <Plus className="w-4 h-4" /> Add Set
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Exercise UI */}
        {isAddingExercise ? (
          <form onSubmit={handleAddExerciseSubmit} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl animate-fade-in">
            <Input 
              autoFocus
              label="Exercise Name"
              placeholder="e.g. Bench Press"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={!newExerciseName}>Add Exercise</Button>
              <Button type="button" variant="ghost" onClick={() => setIsAddingExercise(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" size="lg" onClick={() => setIsAddingExercise(true)} className="py-4 border-dashed">
            <Plus className="w-5 h-5" /> Add Exercise
          </Button>
        )}
      </div>

      <div className="pt-6">
        <Button size="lg" onClick={onFinish} className="bg-green-600 hover:bg-green-500 shadow-green-900/20">
          Finish Workout
        </Button>
      </div>
    </div>
  );
};

const HistoryView: React.FC<{ workouts: Workout[] }> = ({ workouts }) => {
  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <HistoryIcon className="w-12 h-12 mb-2 opacity-50" />
        <p>No workouts recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Workout History</h2>
      {[...workouts].reverse().map(workout => (
        <div key={workout.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-lg text-white">{workout.name}</h3>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(workout.date).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Timer className="w-3 h-3"/> {Math.floor((workout.durationSeconds || 0) / 60)} min</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-orange-500 bg-orange-950/30 px-2 py-1 rounded">
                {workout.exercises.length} Exercises
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            {workout.exercises.slice(0, 3).map(ex => (
              <div key={ex.id} className="text-sm text-zinc-400 flex justify-between border-b border-zinc-800/50 pb-1 last:border-0">
                <span>{ex.name}</span>
                <span className="font-mono text-zinc-500">{ex.sets.length} sets</span>
              </div>
            ))}
            {workout.exercises.length > 3 && (
              <div className="text-xs text-zinc-600 pt-1">+{workout.exercises.length - 3} more...</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;