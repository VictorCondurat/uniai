'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  Globe,
  Shield,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  key: string;
  name: string;
  active: boolean;
  created: string;
  expires?: string;
  lastUsed?: string;
  usageLimit?: number;
  killSwitchActive: boolean;
  permissions: string[];
  ipWhitelist: string[];
  models: string[];
  webhookUrl?: string;
  projectId?: string;
}

interface Project {
  id: string;
  name: string;
}


export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    projectId: '',
    usageLimit: '',
    permissions: [] as string[],
    ipWhitelist: '',
    models: [] as string[],
    webhookUrl: '',
    expires: '',
  });

  const availableModels = [
    'gpt-4-turbo-preview',
    'gpt-3.5-turbo',
    'claude-3-opus',
    'claude-3-sonnet',
    'gemini-pro',
    'gemini-pro-vision',
  ];

  const availablePermissions = [
    'read:usage',
    'write:usage',
    'read:models',
    'write:models',
    'read:billing',
    'admin:all',
  ];

  useEffect(() => {
    fetchApiKeys();
    fetchProjects();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      const data = await response.json();

      if (Array.isArray(data)) {
        setKeys(data);
      } else {
        setKeys([]);
      }
    } catch (error) {
      toast.error('Failed to fetch API keys');
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (Array.isArray(data)) {
        setProjects(data);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
    }
  };



  const handleCreateKey = async () => {
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ipWhitelist: formData.ipWhitelist
            .split(',')
            .map((ip) => ip.trim())
            .filter(Boolean),
          usageLimit: formData.usageLimit
            ? parseFloat(formData.usageLimit)
            : undefined,
          expires: formData.expires
            ? new Date(formData.expires).toISOString()
            : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create API key');

      const newKey = await response.json();
      setKeys([...keys, newKey]);
      setCreateDialogOpen(false);
      resetForm();


      toast.success('API key created successfully');
    } catch {
      toast.error('Failed to create API key');
    }
  };

  const handleUpdateKey = async (keyId: string, updates: Partial<ApiKey>) => {
    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update API key');

      const updatedKey = await response.json();
      setKeys(keys.map((k) => (k.id === keyId ? updatedKey : k)));

      toast.success('API key updated successfully');
    } catch {
      toast.error('Failed to update API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke API key');

      setKeys(keys.filter((k) => k.id !== keyId));

      toast.success('API key revoked successfully');
    } catch {

      toast.error('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.info('You can paste it in your application settings');
  };

  const toggleShowKey = (keyId: string) => {
    setShowKey((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      projectId: '',
      usageLimit: '',
      permissions: [],
      ipWhitelist: '',
      models: [],
      webhookUrl: '',
      expires: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your API keys for accessing UniAI services
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Key</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Configure your new API key with specific permissions and settings
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="limits">Limits</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Production API Key"
                  />
                </div>

                <div>
                  <Label htmlFor="project">Project (Optional)</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, projectId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div>
                  <Label>Permissions</Label>
                  <div className="space-y-2 mt-2">
                    {availablePermissions.map((permission) => (
                      <div key={permission} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={permission}
                          checked={formData.permissions.includes(permission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                permissions: [...formData.permissions, permission],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                permissions: formData.permissions.filter((p) => p !== permission),
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={permission} className="font-normal">
                          {permission}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Allowed Models</Label>
                  <div className="space-y-2 mt-2">
                    {availableModels.map((model) => (
                      <div key={model} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={model}
                          checked={formData.models.includes(model)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                models: [...formData.models, model],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                models: formData.models.filter((m) => m !== model),
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={model} className="font-normal">
                          {model}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <div>
                  <Label htmlFor="ipWhitelist">IP Whitelist (comma-separated)</Label>
                  <Input
                    id="ipWhitelist"
                    value={formData.ipWhitelist}
                    onChange={(e) =>
                      setFormData({ ...formData, ipWhitelist: e.target.value })
                    }
                    placeholder="192.168.1.1, 10.0.0.0/24"
                  />
                  <p className="text-sm text-gray-500 mt-1">Leave empty to allow all IPs</p>
                </div>

                <div>
                  <Label htmlFor="expires">Expiration Date (Optional)</Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={formData.expires}
                    onChange={(e) =>
                      setFormData({ ...formData, expires: e.target.value })
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="limits" className="space-y-4">
                <div>
                  <Label htmlFor="usageLimit">Monthly Usage Limit ($)</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, usageLimit: e.target.value })
                    }
                    placeholder="1000"
                  />
                  <p className="text-sm text-gray-500 mt-1">Leave empty for unlimited usage</p>
                </div>

                <div>
                  <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
                  <Input
                    id="webhookUrl"
                    value={formData.webhookUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, webhookUrl: e.target.value })
                    }
                    placeholder="https://your-api.com/webhook"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Receive notifications for key events
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateKey}>Create Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {keys.map((key) => (
          <Card key={key.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{key.name}</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Created: {formatDate(key.created)}</span>
                    {key.lastUsed && <span>Last used: {formatDate(key.lastUsed)}</span>}
                    {key.expires && <span>Expires: {formatDate(key.expires)}</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={key.active ? 'success' : 'destructive'}>
                    {key.active ? 'Active' : 'Inactive'}
                  </Badge>
                  {key.killSwitchActive && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Kill Switch Active</span>
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1 font-mono text-sm bg-gray-100 px-3 py-2 rounded">
                  {showKey[key.id] ? key.key : '••••••••••••••••••••••••••••••••'}
                </div>
                <Button size="sm" variant="ghost" onClick={() => toggleShowKey(key.id)}>
                  {showKey[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(key.key)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {key.projectId && projects.find((p) => p.id === key.projectId) && (
                  <div>
                    <p className="text-gray-500">Project</p>
                    <p className="font-medium">
                      {projects.find((p) => p.id === key.projectId)?.name}
                    </p>
                  </div>
                )}
                {key.usageLimit && (
                  <div>
                    <p className="text-gray-500">Monthly Limit</p>
                    <p className="font-medium">${key.usageLimit}</p>
                  </div>
                )}
                {key.ipWhitelist.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-500">{key.ipWhitelist.length} IPs whitelisted</p>
                  </div>
                )}
                {key.webhookUrl && (
                  <div className="flex items-center space-x-1">
                    <Webhook className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-500">Webhook enabled</p>
                  </div>
                )}
              </div>

              {(key.permissions.length > 0 || key.models.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {key.permissions.map((permission) => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      {permission}
                    </Badge>
                  ))}
                  {key.models.map((model) => (
                    <Badge key={model} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleUpdateKey(key.id, { killSwitchActive: !key.killSwitchActive })
                  }
                >
                  {key.killSwitchActive ? 'Disable' : 'Enable'} Kill Switch
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Revoke
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The API key will be permanently revoked.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRevokeKey(key.id)}>
                        Revoke Key
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {keys.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500 mb-4">No API keys yet</p>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Your First Key</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
