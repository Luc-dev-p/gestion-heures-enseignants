export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Enseignants', value: '0', color: 'from-violet-500 to-violet-600' },
          { label: 'Matières', value: '0', color: 'from-fuchsia-500 to-fuchsia-600' },
          { label: 'Heures saisies', value: '0', color: 'from-amber-500 to-amber-600' },
          { label: 'Heures complémentaires', value: '0', color: 'from-emerald-500 to-emerald-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className="text-3xl font-bold text-gray-800">{card.value}</p>
            <div className={`mt-3 h-1 w-12 rounded-full bg-gradient-to-r ${card.color}`} />
          </div>
        ))}
      </div>
      <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center text-gray-400">
        Les graphiques seront ajoutés dans la V7
      </div>
    </div>
  );
}