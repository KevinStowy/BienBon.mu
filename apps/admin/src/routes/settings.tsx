import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { TabNav } from '../components/ui/TabNav'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../auth/use-auth'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

// Mock categories and tags
const mockCategories = [
  { id: 'cat-001', name: 'Boulangerie', icon: '🍞', partnerCount: 12 },
  { id: 'cat-002', name: 'Restaurant', icon: '🍽️', partnerCount: 28 },
  { id: 'cat-003', name: 'Epicerie', icon: '🛒', partnerCount: 15 },
  { id: 'cat-004', name: 'Cafe', icon: '☕', partnerCount: 9 },
  { id: 'cat-005', name: 'Patisserie', icon: '🧁', partnerCount: 6 },
]

const mockTags = [
  { id: 'tag-001', name: 'Vegetarien', count: 18 },
  { id: 'tag-002', name: 'Halal', count: 34 },
  { id: 'tag-003', name: 'Bio', count: 7 },
  { id: 'tag-004', name: 'Sans gluten', count: 5 },
  { id: 'tag-005', name: 'Local', count: 42 },
]

const mockAdminUsers = [
  {
    id: 'admin-001',
    name: 'Admin Jean',
    email: 'jean@bienbon.mu',
    role: 'ADMIN',
    lastLogin: '2026-02-28T08:00:00Z',
  },
  {
    id: 'admin-002',
    name: 'Admin Sophie',
    email: 'sophie@bienbon.mu',
    role: 'ADMIN',
    lastLogin: '2026-02-27T16:00:00Z',
  },
  {
    id: 'superadmin-001',
    name: 'SuperAdmin Root',
    email: 'root@bienbon.mu',
    role: 'SUPER_ADMIN',
    lastLogin: '2026-02-28T06:00:00Z',
  },
]

function CategoriesTab() {
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 500))
    setNewCategoryName('')
    setIsSaving(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter une categorie</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label htmlFor="new-category" className="sr-only">
              Nom de la categorie
            </label>
            <input
              id="new-category"
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Ex: Sushi, Vegan..."
              aria-label="Nom de la nouvelle categorie"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#1A1A1A]
                placeholder:text-[#9CA3AF]
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { void handleAdd() }
              }}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            isLoading={isSaving}
            onClick={() => { void handleAdd() }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Ajouter
          </Button>
        </div>
      </Card>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Liste des categories">
          <caption className="sr-only">Categories de paniers</caption>
          <thead className="bg-[#F7F4EF]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Categorie</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-[#6B7280] uppercase">Partenaires</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-[#6B7280] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {mockCategories.map((cat) => (
              <tr key={cat.id} className="hover:bg-[#F7F4EF] transition-colors">
                <td className="px-4 py-3">
                  <span className="font-semibold text-[#1A1A1A]">{cat.name}</span>
                </td>
                <td className="px-4 py-3 text-right text-[#6B7280]">{cat.partnerCount}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    aria-label={`Supprimer la categorie ${cat.name}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#C62828] hover:bg-[#FFEBEE] rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TagsTab() {
  const [newTagName, setNewTagName] = useState('')

  const handleAdd = () => {
    setNewTagName('')
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un tag</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label htmlFor="new-tag" className="sr-only">Nom du tag</label>
            <input
              id="new-tag"
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Ex: Epice, Doux..."
              aria-label="Nom du nouveau tag"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#1A1A1A]
                placeholder:text-[#9CA3AF]
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Ajouter
          </Button>
        </div>
      </Card>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Liste des tags">
          <caption className="sr-only">Tags disponibles</caption>
          <thead className="bg-[#F7F4EF]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Tag</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-[#6B7280] uppercase">Utilisations</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-[#6B7280] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {mockTags.map((tag) => (
              <tr key={tag.id} className="hover:bg-[#F7F4EF] transition-colors">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                    {tag.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-[#6B7280]">{tag.count}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    aria-label={`Supprimer le tag ${tag.name}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#C62828] hover:bg-[#FFEBEE] rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminUsersTab() {
  const { isSuperAdmin } = useAuth()

  if (!isSuperAdmin) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-[#6B7280] font-semibold">
            Acces reserve aux Super Administrateurs
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Administrateurs">
          <caption className="sr-only">Liste des utilisateurs administrateurs</caption>
          <thead className="bg-[#F7F4EF]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Nom</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Role</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Derniere connexion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {mockAdminUsers.map((admin) => (
              <tr key={admin.id} className="hover:bg-[#F7F4EF] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#1A1A1A]">{admin.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{admin.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={admin.role === 'SUPER_ADMIN' ? 'critical' : 'active'}>
                    {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[#6B7280] text-xs">
                  <time dateTime={admin.lastLogin}>
                    {new Date(admin.lastLogin).toLocaleDateString('fr-MU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inviter un administrateur</CardTitle>
        </CardHeader>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-4 max-w-sm"
        >
          <div>
            <label
              htmlFor="invite-email"
              className="block text-sm font-semibold text-[#1A1A1A] mb-1.5"
            >
              Adresse email
            </label>
            <input
              id="invite-email"
              type="email"
              placeholder="admin@bienbon.mu"
              aria-label="Email du nouvel administrateur"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white
                placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            />
          </div>
          <div>
            <label
              htmlFor="invite-role"
              className="block text-sm font-semibold text-[#1A1A1A] mb-1.5"
            >
              Role
            </label>
            <select
              id="invite-role"
              aria-label="Role du nouvel administrateur"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            >
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <Button variant="primary" size="sm" type="submit" className="self-start">
            <Save className="w-4 h-4" aria-hidden="true" />
            Envoyer l'invitation
          </Button>
        </form>
      </Card>
    </div>
  )
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('categories')
  const { isSuperAdmin } = useAuth()

  const tabs = [
    { id: 'categories', label: 'Categories' },
    { id: 'tags', label: 'Tags' },
    ...(isSuperAdmin ? [{ id: 'admins', label: 'Administrateurs' }] : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Parametres</h1>
        <p className="text-sm text-[#6B7280] mt-1">Configuration de la plateforme</p>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div role="tabpanel" id={`tabpanel-${activeTab}`}>
        {activeTab === 'categories' ? <CategoriesTab /> : null}
        {activeTab === 'tags' ? <TagsTab /> : null}
        {activeTab === 'admins' ? <AdminUsersTab /> : null}
      </div>
    </div>
  )
}
