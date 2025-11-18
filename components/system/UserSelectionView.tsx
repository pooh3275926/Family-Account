import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { UserProfile } from '../../types';
import { UserPlus, ChevronRight, LogOut } from 'lucide-react';

const UserSelectionView: React.FC = () => {
    const { state, dispatch, googleSignOut } = useData();
    const [newProfileName, setNewProfileName] = useState('');

    const handleCreateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProfileName.trim()) {
            const newProfile: UserProfile = {
                id: Date.now().toString(),
                name: newProfileName.trim()
            };
            dispatch({ type: 'ADD_PROFILE', payload: newProfile });
            setNewProfileName('');
        }
    };

    const handleSelectProfile = (profileId: string) => {
        dispatch({ type: 'SELECT_PROFILE', payload: profileId });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-stone-950 text-stone-200 p-4">
            <div className="w-full max-w-md mx-auto bg-stone-900 rounded-2xl shadow-2xl p-8 space-y-8">
                <div>
                    <h2 className="text-center text-3xl font-bold text-amber-300">選擇使用者</h2>
                    <p className="mt-2 text-center text-sm text-stone-400">請選擇一個設定檔以繼續，或建立一個新的。</p>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-stone-500 uppercase">現有使用者</h3>
                    <ul className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {state.profiles.length > 0 ? (
                            state.profiles.map(profile => (
                                <li key={profile.id}>
                                    <button
                                        onClick={() => handleSelectProfile(profile.id)}
                                        className="w-full text-left flex justify-between items-center p-4 rounded-lg bg-stone-800 hover:bg-stone-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        <span className="font-medium text-stone-100">{profile.name}</span>
                                        <ChevronRight className="text-stone-500" size={20} />
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="text-center text-stone-500 py-4">尚無使用者設定檔</li>
                        )}
                    </ul>
                </div>
                
                <div>
                    <h3 className="text-sm font-semibold text-stone-500 uppercase mb-4">建立新使用者</h3>
                    <form onSubmit={handleCreateProfile} className="flex gap-2">
                        <input
                            type="text"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            placeholder="輸入使用者名稱..."
                            className="flex-grow bg-stone-800 border border-stone-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5"
                            required
                        />
                        <button
                            type="submit"
                            className="flex-shrink-0 bg-amber-600 text-white p-3 rounded-lg hover:bg-amber-700 transition-colors duration-200 flex items-center justify-center"
                        >
                            <UserPlus size={20} />
                        </button>
                    </form>
                </div>
                 <div className="pt-4 border-t border-stone-700 text-center">
                    <button onClick={googleSignOut} className="text-sm text-stone-500 hover:text-stone-300 flex items-center justify-center mx-auto gap-2">
                        <LogOut size={16}/>
                        <span>登出 Google 帳號</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserSelectionView;
